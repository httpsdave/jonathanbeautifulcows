import { NextResponse } from "next/server";

type WikimediaPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
  }>;
};

type WikimediaResponse = {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
};

type CowImage = {
  url: string;
  alt: string;
};

const BASE_URL = "https://commons.wikimedia.org/w/api.php";
const COW_KEYWORDS = /\b(cow|cows|cattle|bull|calf|heifer|dairy|bovine|pasture|milking)\b/i;
const NOISY_KEYWORDS =
  /\b(book|illustration|drawing|painting|poster|cover|stamp|newspaper|magazine|child|children|wizard|oz|poultry)\b/i;

function parseCount(value: string | null) {
  const parsed = Number.parseInt(value ?? "6", 10);
  if (Number.isNaN(parsed)) return 6;
  return Math.max(3, Math.min(12, parsed));
}

function normalizeTitle(title?: string) {
  if (!title) return "Cow photo";
  return title.replace(/^File:/, "").replace(/[_.-]+/g, " ").trim();
}

function isLikelyCowPhoto(title: string) {
  if (!COW_KEYWORDS.test(title)) return false;
  if (NOISY_KEYWORDS.test(title)) return false;
  return true;
}

function pickRandom<T>(items: T[], count: number) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy.slice(0, count);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = parseCount(searchParams.get("count"));
  const query = searchParams.get("q")?.trim() || "cow farm";

  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: `${query} cow animal photo filetype:jpg`,
      gsrnamespace: "6",
      gsrlimit: "30",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "1280",
      format: "json",
      origin: "*",
    });

    const response = await fetch(`${BASE_URL}?${params.toString()}`, {
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      throw new Error(`Wikimedia request failed with status ${response.status}`);
    }

    const data = (await response.json()) as WikimediaResponse;
    const pages = Object.values(data.query?.pages ?? {});

    const candidates: CowImage[] = pages.flatMap((page) => {
      const image = page.imageinfo?.[0];
      if (!image?.url) return [];

      const normalizedTitle = normalizeTitle(page.title);
      if (!isLikelyCowPhoto(normalizedTitle)) return [];

      const mime = image.mime ?? "";
      if (!mime.startsWith("image/") || mime.includes("svg")) return [];

      const imageUrl = image.thumburl ?? image.url;

      return [
        {
          url: imageUrl,
          alt: normalizedTitle,
        },
      ];
    });

    const unique = Array.from(new Map(candidates.map((item) => [item.url, item])).values());
    const images = pickRandom(unique, count);

    return NextResponse.json(
      {
        source: "wikimedia-commons",
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