import { NextResponse } from "next/server";

type WikimediaPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
  }>;
};

type WikimediaSearchResponse = {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
};

type WikimediaCategoryResponse = {
  query?: {
    categorymembers?: Array<{
      title?: string;
    }>;
  };
};

type WikiSummaryImageResponse = {
  title?: string;
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
};

type CowImage = {
  url: string;
  alt: string;
};

const BASE_URL = "https://commons.wikimedia.org/w/api.php";
const COW_KEYWORDS = /\b(cow|cows|cattle|bull|calf|heifer|dairy|bovine|pasture|milking)\b/i;
const BREED_KEYWORDS = /\b(highland|holstein|friesian|jersey|longhorn|angus|zebu|yak)\b/i;
const NOISY_KEYWORDS =
  /\b(book|illustration|drawing|painting|poster|cover|stamp|newspaper|magazine|child|children|wizard|oz|poultry)\b/i;

const SEARCH_FALLBACK_QUERIES = [
  "cow portrait",
  "cattle pasture",
  "highland cattle",
  "jersey cow",
  "dairy cow",
];

const BREED_CATEGORIES = [
  "Category:Highland cattle",
  "Category:Holstein Friesian cattle",
  "Category:Jersey cattle",
  "Category:Texas Longhorn cattle",
];

const WIKI_IMAGE_PAGES = ["Cattle", "Highland_cattle", "Holstein_Friesian_cattle", "Jersey_cattle"];

function parseCount(value: string | null) {
  const parsed = Number.parseInt(value ?? "6", 10);
  if (Number.isNaN(parsed)) return 6;
  return Math.max(3, Math.min(12, parsed));
}

function parseQuery(value: string | null) {
  const normalized = (value ?? "cow").replace(/\s+/g, " ").trim();
  return normalized || "cow";
}

function normalizeTitle(title?: string) {
  if (!title) return "Cow photo";
  return title.replace(/^File:/, "").replace(/[_.-]+/g, " ").trim();
}

function isLikelyCowPhoto(title: string, queryHint: string) {
  if (NOISY_KEYWORDS.test(title)) return false;

  if (COW_KEYWORDS.test(title) || BREED_KEYWORDS.test(title)) return true;
  if (COW_KEYWORDS.test(queryHint) || BREED_KEYWORDS.test(queryHint)) return true;

  return false;
}

function pickRandom<T>(items: T[], count: number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy.slice(0, count);
}

function uniqueByUrl(images: CowImage[]) {
  return Array.from(new Map(images.map((image) => [image.url, image])).values());
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function mapPagesToImages(
  pages: WikimediaPage[],
  options: {
    queryHint: string;
    requireCowKeyword: boolean;
  },
) {
  return pages.flatMap((page) => {
    const image = page.imageinfo?.[0];
    if (!image?.url) return [];

    const mime = image.mime ?? "";
    if (!mime.startsWith("image/") || mime.includes("svg")) return [];

    const normalizedTitle = normalizeTitle(page.title);
    if (NOISY_KEYWORDS.test(normalizedTitle)) return [];

    if (options.requireCowKeyword && !isLikelyCowPhoto(normalizedTitle, options.queryHint)) {
      return [];
    }

    return [
      {
        url: image.thumburl ?? image.url,
        alt: normalizedTitle,
      },
    ];
  });
}

async function fetchFromWikimediaSearch(query: string, limit: number) {
  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1280",
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "JBC-Website/1.0",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return [] as CowImage[];

  const data = (await response.json()) as WikimediaSearchResponse;
  const pages = Object.values(data.query?.pages ?? {});

  return uniqueByUrl(
    mapPagesToImages(pages, {
      queryHint: query,
      requireCowKeyword: true,
    }),
  );
}

async function fetchCategoryTitles(category: string, limit: number) {
  const params = new URLSearchParams({
    action: "query",
    list: "categorymembers",
    cmtitle: category,
    cmnamespace: "6",
    cmlimit: String(limit),
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": "JBC-Website/1.0",
    },
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return [] as string[];

  const data = (await response.json()) as WikimediaCategoryResponse;
  return (data.query?.categorymembers ?? [])
    .map((item) => item.title?.trim())
    .filter((title): title is string => Boolean(title && title.startsWith("File:")));
}

async function fetchImageInfoForTitles(titles: string[]) {
  if (!titles.length) return [] as CowImage[];

  const responses = await Promise.all(
    chunk(titles, 24).map(async (batch) => {
      const params = new URLSearchParams({
        action: "query",
        prop: "imageinfo",
        iiprop: "url|mime",
        iiurlwidth: "1280",
        titles: batch.join("|"),
        format: "json",
        origin: "*",
      });

      const response = await fetch(`${BASE_URL}?${params.toString()}`, {
        headers: {
          "User-Agent": "JBC-Website/1.0",
        },
        next: { revalidate: 60 * 60 },
      });

      if (!response.ok) return [] as CowImage[];

      const payload = (await response.json()) as WikimediaSearchResponse;
      const pages = Object.values(payload.query?.pages ?? {});

      return mapPagesToImages(pages, {
        queryHint: "cow cattle breed",
        requireCowKeyword: false,
      });
    }),
  );

  return uniqueByUrl(responses.flat());
}

async function fetchFromCategoryFallbacks() {
  const titleGroups = await Promise.all(BREED_CATEGORIES.map((category) => fetchCategoryTitles(category, 42)));
  const titles = Array.from(new Set(titleGroups.flat()));

  return fetchImageInfoForTitles(titles);
}

async function fetchFromWikipediaSummaryImages() {
  const images = await Promise.all(
    WIKI_IMAGE_PAGES.map(async (page) => {
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`, {
          headers: {
            "User-Agent": "JBC-Website/1.0",
          },
          next: { revalidate: 60 * 60 * 24 },
        });

        if (!response.ok) return null;

        const payload = (await response.json()) as WikiSummaryImageResponse;
        const imageUrl = payload.originalimage?.source ?? payload.thumbnail?.source;
        if (!imageUrl) return null;
        if (!imageUrl.includes("upload.wikimedia.org")) return null;

        const title = normalizeTitle(payload.title);
        if (NOISY_KEYWORDS.test(title)) return null;

        return {
          url: imageUrl,
          alt: title,
        } satisfies CowImage;
      } catch {
        return null;
      }
    }),
  );

  return images.filter((image): image is CowImage => image !== null);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseCount(searchParams.get("count"));
  const query = parseQuery(searchParams.get("q"));

  try {
    const queryPool = Array.from(new Set([query, ...SEARCH_FALLBACK_QUERIES]));

    const searchGroups = await Promise.all(
      queryPool.map(async (candidateQuery) => {
        try {
          return await fetchFromWikimediaSearch(candidateQuery, 36);
        } catch {
          return [] as CowImage[];
        }
      }),
    );

    let source = "wikimedia-search";
    let candidates = uniqueByUrl(searchGroups.flat());

    if (candidates.length < count) {
      const categoryImages = await fetchFromCategoryFallbacks();
      if (categoryImages.length) {
        source = "wikimedia-search-and-categories";
      }
      candidates = uniqueByUrl([...candidates, ...categoryImages]);
    }

    if (candidates.length < count) {
      const wikiSummaryImages = await fetchFromWikipediaSummaryImages();
      if (wikiSummaryImages.length) {
        source = `${source}-and-wikipedia`;
      }
      candidates = uniqueByUrl([...candidates, ...wikiSummaryImages]);
    }

    const images = pickRandom(candidates, count);

    return NextResponse.json(
      {
        source,
        images,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        source: "fallback",
        images: [],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      },
    );
  }
}