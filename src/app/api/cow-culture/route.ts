import { NextResponse } from "next/server";

type RedditChildData = {
  title?: string;
  permalink?: string;
  url?: string;
  subreddit?: string;
  score?: number;
  over_18?: boolean;
  stickied?: boolean;
};

type RedditResponse = {
  data?: {
    children?: Array<{
      data?: RedditChildData;
    }>;
  };
};

type WikiSummary = {
  title?: string;
  extract?: string;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type CowDiscussion = {
  title: string;
  link: string;
  subreddit: string;
  score: number;
};

type CowFact = {
  title: string;
  detail: string;
  sourceUrl: string;
};

const REDDIT_ENDPOINTS = [
  "https://www.reddit.com/r/cows/new.json?limit=8",
  "https://www.reddit.com/search.json?q=cow%20art%20OR%20cow%20symbolism&sort=new&limit=8",
];

const WIKI_PAGES = ["Cattle", "Highland_cattle", "Holstein_Friesian_cattle", "Jersey_cattle"];

const COW_KEYWORDS = /\b(cow|cows|cattle|bull|calf|heifer|bovine|dairy)\b/i;

const FALLBACK_DISCUSSIONS: CowDiscussion[] = [
  {
    title: "Current discussions from r/cows",
    link: "https://www.reddit.com/r/cows/new/",
    subreddit: "r/cows",
    score: 0,
  },
  {
    title: "Cow art and symbolism conversation",
    link: "https://www.reddit.com/search/?q=cow%20art",
    subreddit: "r/search",
    score: 0,
  },
  {
    title: "Field stories from farming communities",
    link: "https://www.reddit.com/search/?q=cow%20farm%20story",
    subreddit: "r/search",
    score: 0,
  },
];

const FALLBACK_FACTS: CowFact[] = [
  {
    title: "Cattle",
    detail:
      "Cattle were among the earliest domesticated livestock and continue to shape agriculture, cuisine, and culture worldwide.",
    sourceUrl: "https://en.wikipedia.org/wiki/Cattle",
  },
  {
    title: "Highland Cattle",
    detail:
      "Highland cattle are known for their long horns and layered coat, well adapted to windy and cold climates.",
    sourceUrl: "https://en.wikipedia.org/wiki/Highland_cattle",
  },
  {
    title: "Holstein Friesian",
    detail:
      "Holstein Friesians are one of the most recognized dairy breeds due to their black-and-white coat pattern and milk yield.",
    sourceUrl: "https://en.wikipedia.org/wiki/Holstein_Friesian_cattle",
  },
];

function cleanText(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function compactFact(extract: string | undefined) {
  const sanitized = cleanText(extract);
  if (!sanitized) return "";

  const sentences = sanitized.split(/(?<=[.!?])\s+/).filter(Boolean);
  return cleanText(sentences.slice(0, 2).join(" "));
}

function uniqueBy<T>(items: T[], keySelector: (item: T) => string) {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keySelector(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

async function fetchRedditDiscussions() {
  const feedGroups = await Promise.all(
    REDDIT_ENDPOINTS.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": "JBC-Website/1.0",
          },
          next: { revalidate: 60 * 15 },
        });

        if (!response.ok) return [] as CowDiscussion[];

        const payload = (await response.json()) as RedditResponse;
        const posts = payload.data?.children ?? [];

        return posts
          .map((entry) => {
            const data = entry.data;
            const title = cleanText(data?.title);
            if (!title || !COW_KEYWORDS.test(title)) return null;
            if (data?.over_18 || data?.stickied) return null;

            const link = data?.permalink
              ? `https://www.reddit.com${data.permalink}`
              : cleanText(data?.url);
            if (!link) return null;

            return {
              title,
              link,
              subreddit: `r/${cleanText(data?.subreddit) || "cows"}`,
              score: Number.isFinite(data?.score) ? Number(data?.score) : 0,
            } satisfies CowDiscussion;
          })
          .filter((post): post is CowDiscussion => post !== null);
      } catch {
        return [] as CowDiscussion[];
      }
    }),
  );

  return uniqueBy(feedGroups.flat(), (post) => post.link).slice(0, 4);
}

async function fetchCowFacts() {
  const facts = await Promise.all(
    WIKI_PAGES.map(async (page) => {
      try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${page}`, {
          headers: {
            "User-Agent": "JBC-Website/1.0",
          },
          next: { revalidate: 60 * 60 * 24 },
        });

        if (!response.ok) return null;

        const payload = (await response.json()) as WikiSummary;
        const title = cleanText(payload.title);
        const detail = compactFact(payload.extract);
        const sourceUrl =
          cleanText(payload.content_urls?.desktop?.page) ||
          `https://en.wikipedia.org/wiki/${page}`;

        if (!title || !detail || !sourceUrl) return null;

        return {
          title,
          detail,
          sourceUrl,
        } satisfies CowFact;
      } catch {
        return null;
      }
    }),
  );

  return facts.filter((fact): fact is CowFact => fact !== null).slice(0, 4);
}

export async function GET() {
  try {
    const [discussions, facts] = await Promise.all([fetchRedditDiscussions(), fetchCowFacts()]);

    return NextResponse.json(
      {
        source: "reddit-and-wikipedia",
        discussions: discussions.length ? discussions : FALLBACK_DISCUSSIONS,
        facts: facts.length ? facts : FALLBACK_FACTS,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=86400",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        source: "fallback",
        discussions: FALLBACK_DISCUSSIONS,
        facts: FALLBACK_FACTS,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300",
        },
      },
    );
  }
}
