"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Milk,
  Newspaper,
  Sparkles,
  Star,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type CowImage = {
  url: string;
  alt: string;
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

type GalleryCard = {
  alt: string;
  caption: string;
  mood: string;
  url?: string;
};

type CowApiResponse = {
  images?: CowImage[];
};

type CowCultureResponse = {
  discussions?: CowDiscussion[];
  facts?: CowFact[];
};

const CAPTIONS = [
  "Highland Portrait",
  "Golden Hour Study",
  "Pasture Character",
  "Holy Cow Moment",
  "Quiet Strength",
  "Field Encounter",
  "Rural Presence",
  "Evening Grazing",
];

const FALLBACK_CARDS: GalleryCard[] = [
  {
    alt: "Cow placeholder",
    caption: "Pasture Portrait",
    mood: "A calm view while new images load.",
  },
  {
    alt: "Cow field placeholder",
    caption: "Rural Character",
    mood: "Study of expression, posture, and setting.",
  },
  {
    alt: "Cow silhouette placeholder",
    caption: "Landscape Presence",
    mood: "Where cattle and terrain shape each other.",
  },
  {
    alt: "Cow art placeholder",
    caption: "Symbolic Reading",
    mood: "Cow imagery in visual culture and art.",
  },
  {
    alt: "Cow close-up placeholder",
    caption: "Distinct Personality",
    mood: "Attention to mood, stance, and detail.",
  },
  {
    alt: "Cow road placeholder",
    caption: "Unexpected Setting",
    mood: "A reminder that cows appear in surprising places.",
  },
];

const FEATURES: Array<{ title: string; description: string; icon: LucideIcon }> = [
  {
    title: "Breed Personalities",
    description: "Different breeds carry different moods, forms, and social behavior.",
    icon: Milk,
  },
  {
    title: "Art and Symbolism",
    description: "Cow imagery appears in folklore, faith, craft, and contemporary design.",
    icon: BadgeCheck,
  },
  {
    title: "Unexpected Moments",
    description: "From holy cow scenes to street encounters, curiosity is always welcome.",
    icon: Star,
  },
];

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

export default function JbcLanding() {
  const [images, setImages] = useState<CowImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [cultureLoading, setCultureLoading] = useState(true);
  const [discussions, setDiscussions] = useState<CowDiscussion[]>([]);
  const [facts, setFacts] = useState<CowFact[]>([]);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, true>>({});
  const [pendingDiscussionRedirect, setPendingDiscussionRedirect] = useState<CowDiscussion | null>(null);

  const markImageFailed = (url?: string) => {
    if (!url) return;
    setFailedImages((previous) => {
      if (previous[url]) return previous;
      return {
        ...previous,
        [url]: true,
      };
    });
  };

  const isImageUsable = (url?: string) => Boolean(url && !failedImages[url]);

  const pendingRedirectHost = useMemo(() => {
    if (!pendingDiscussionRedirect) return "";

    try {
      return new URL(pendingDiscussionRedirect.link).hostname.replace(/^www\./i, "");
    } catch {
      return "external site";
    }
  }, [pendingDiscussionRedirect]);

  const confirmDiscussionRedirect = () => {
    if (!pendingDiscussionRedirect) return;

    window.open(pendingDiscussionRedirect.link, "_blank", "noopener,noreferrer");
    setPendingDiscussionRedirect(null);
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadPageData() {
      const [cowsResult, cultureResult] = await Promise.allSettled([
        fetch("/api/cows?count=7&q=cow%20portrait%20pasture", {
          signal: controller.signal,
        }),
        fetch("/api/cow-culture", {
          signal: controller.signal,
        }),
      ]);

      if (controller.signal.aborted) return;

      if (cowsResult.status === "fulfilled") {
        try {
          const data = (await cowsResult.value.json()) as CowApiResponse;
          setFailedImages({});
          setImages(Array.isArray(data.images) ? data.images : []);
        } catch {
          setFailedImages({});
          setImages([]);
        }
      } else {
        setFailedImages({});
        setImages([]);
      }

      if (cultureResult.status === "fulfilled") {
        try {
          const data = (await cultureResult.value.json()) as CowCultureResponse;
          setDiscussions(Array.isArray(data.discussions) ? data.discussions : []);
          setFacts(Array.isArray(data.facts) ? data.facts : []);
        } catch {
          setDiscussions([]);
          setFacts([]);
        }
      } else {
        setDiscussions([]);
        setFacts([]);
      }

      setLoading(false);
      setCultureLoading(false);
    }

    void loadPageData();

    return () => controller.abort();
  }, []);

  const galleryCards = useMemo<GalleryCard[]>(() => {
    if (!images.length) {
      return FALLBACK_CARDS;
    }

    const fromApi = images.slice(1, 7).map((image, index) => ({
      alt: image.alt,
      caption: CAPTIONS[index % CAPTIONS.length],
      mood: "Open-source image from Wikimedia Commons.",
      url: image.url,
    }));

    if (fromApi.length >= 6) return fromApi;

    const needed = 6 - fromApi.length;
    return [...fromApi, ...FALLBACK_CARDS.slice(0, needed)];
  }, [images]);

  const spotlight = useMemo<GalleryCard>(() => {
    const hero = images[0];
    if (!hero) {
      return {
        alt: "Featured cow placeholder",
        caption: "Featured Study",
        mood: "A focused image study appears here.",
      };
    }

    return {
      alt: hero.alt,
      caption: "Featured Study",
      mood: "Open-source image from Wikimedia Commons.",
      url: hero.url,
    };
  }, [images]);

  const discussionItems = useMemo(() => {
    if (discussions.length) return discussions.slice(0, 4);
    return FALLBACK_DISCUSSIONS;
  }, [discussions]);

  const factItems = useMemo(() => {
    if (facts.length) return facts.slice(0, 4);
    return FALLBACK_FACTS;
  }, [facts]);

  return (
    <div className="jbc-grain relative min-h-screen overflow-hidden">
      <div className="jbc-grid-lines pointer-events-none absolute inset-0 opacity-40" />
      <div className="animate-neon-pulse pointer-events-none absolute -left-14 top-24 h-64 w-64 rounded-full bg-(--jbc-neon)/20 blur-3xl" />
      <div className="animate-neon-pulse pointer-events-none absolute -right-20 top-3 h-72 w-72 rounded-full bg-(--jbc-neon)/16 blur-3xl" />

      <main className="relative z-10 pb-20">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-6 sm:px-8 md:px-10">
          <Link href="/" className="group inline-flex items-end gap-2">
            <span className="font-display text-2xl leading-none text-(--jbc-neon) sm:text-3xl">JBC</span>
            <span className="font-script -mb-0.5 text-xl text-foreground sm:text-2xl">JonathanBeautifulCows</span>
          </Link>

          <nav className="hidden items-center gap-7 text-xs uppercase tracking-[0.16em] text-white/74 md:flex">
            <Link href="#explore" className="transition-colors hover:text-(--jbc-neon)">
              Explore
            </Link>
            <Link href="#culture" className="transition-colors hover:text-(--jbc-neon)">
              Culture
            </Link>
            <Link href="#join" className="transition-colors hover:text-(--jbc-neon)">
              Join
            </Link>
            <Link href="#about" className="transition-colors hover:text-(--jbc-neon)">
              About
            </Link>
          </nav>
        </header>

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-16 pt-12 sm:px-8 md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pt-18">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 border border-(--jbc-neon) px-3 py-1 text-xs uppercase tracking-[0.2em] text-(--jbc-neon)"
            >
              <Sparkles className="size-3" />
              Visual Archive Since 2026
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.05 }}
              className="font-display text-[clamp(2.6rem,8vw,6.4rem)] leading-[0.9] uppercase"
            >
              Jonathan
              <span className="jbc-line block text-(--jbc-neon)">Beautiful</span>
              Cows
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.12 }}
              className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-white/82"
            >
              JonathanBeautifulCows is a living gallery dedicated to the beauty of cows: their personalities,
              symbolism, breeds, and presence in art. We also collect the occasional unexpected image, including
              rare holy cow moments that feel both funny and striking.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.22 }}
              className="mt-9 flex flex-wrap gap-3"
            >
              <Button asChild size="lg" className="text-black [&_svg]:text-black">
                <Link href="#join">
                  Join JBC
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#explore">Explore Collection</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 grid max-w-lg grid-cols-3 gap-3 border-t border-white/20 pt-5"
            >
              <div>
                <p className="font-display text-xl text-(--jbc-neon)">Growing</p>
                <p className="text-xs uppercase tracking-widest text-white/70">Breed Profiles</p>
              </div>
              <div>
                <p className="font-display text-xl text-(--jbc-neon)">Curated</p>
                <p className="text-xs uppercase tracking-widest text-white/70">Art Notes</p>
              </div>
              <div>
                <p className="font-display text-xl text-(--jbc-neon)">Daily</p>
                <p className="text-xs uppercase tracking-widest text-white/70">Field Moments</p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="relative"
          >
            <div className="jbc-cut relative border-2 border-(--jbc-neon) bg-[linear-gradient(155deg,#0d0f0d_0%,#111411_65%,#070807_100%)] p-4 shadow-[9px_9px_0_var(--jbc-neon)]">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3 text-xs uppercase tracking-[0.12em] text-white/70">
                <span>Featured Cow</span>
                <span className="inline-flex items-center gap-1 text-(--jbc-neon)">
                  <Star className="size-3" />
                  Image Essay
                </span>
              </div>

              <div className="relative aspect-4/5 overflow-hidden border border-white/15 bg-[#121512]">
                {isImageUsable(spotlight.url) ? (
                  <Image
                    src={spotlight.url!}
                    alt={spotlight.alt}
                    fill
                    priority
                    unoptimized
                    sizes="(max-width: 768px) 90vw, 42vw"
                    className="object-cover"
                    onError={() => markImageFailed(spotlight.url)}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(204,255,47,0.25),transparent_40%),#101210]">
                    <p className="font-display px-5 text-center text-3xl uppercase text-(--jbc-neon)">Image Loading</p>
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="font-display text-lg uppercase text-foreground">{spotlight.caption}</p>
                <p className="mt-1 text-sm text-white/75">{spotlight.mood}</p>
              </div>
            </div>

            <div className="animate-float-slow absolute -bottom-5 -left-3 border border-(--jbc-neon) bg-background px-4 py-2 text-[0.72rem] uppercase tracking-[0.2em] text-(--jbc-neon)">
              Cow Character Archive
            </div>
          </motion.div>
        </section>

        <section id="about" className="mx-auto w-full max-w-6xl px-5 py-4 sm:px-8 md:px-10">
          <div className="grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: index * 0.09 }}
                  className="border border-white/20 bg-[#0b0d0b] p-5"
                >
                  <div className="mb-3 inline-flex border border-(--jbc-neon) p-2 text-(--jbc-neon)">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="font-display text-2xl uppercase text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/74">{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section id="explore" className="mx-auto w-full max-w-6xl px-5 pb-6 pt-14 sm:px-8 md:px-10">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="font-script text-3xl text-(--jbc-neon)">Explore</p>
              <h2 className="font-display text-[clamp(2rem,6vw,3.9rem)] leading-[0.92] uppercase">Cow Gallery</h2>
            </div>
            <p className="hidden max-w-xs text-right text-xs uppercase tracking-[0.14em] text-white/58 md:block">
              Open-source images from Wikimedia Commons, with graceful local fallbacks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {galleryCards.map((card, index) => (
              <motion.article
                key={`${card.alt}-${index}`}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: index * 0.07 }}
                className="group relative overflow-hidden border border-white/20 bg-[#090b09]"
              >
                <div className="absolute right-2 top-2 z-10 border border-(--jbc-neon) bg-black/85 px-2 py-1 text-[0.62rem] uppercase tracking-[0.13em] text-(--jbc-neon)">
                  Image Study
                </div>

                <div className="relative aspect-4/3 overflow-hidden border-b border-white/15 bg-[#121512]">
                  {isImageUsable(card.url) ? (
                    <Image
                      src={card.url!}
                      alt={card.alt}
                      fill
                      loading="lazy"
                      unoptimized
                      sizes="(max-width: 768px) 92vw, (max-width: 1280px) 48vw, 31vw"
                      className="object-cover grayscale transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
                      onError={() => markImageFailed(card.url)}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_18%_15%,rgba(204,255,47,0.2),transparent_38%),#101210] px-4 text-center">
                      <p className="font-display text-2xl uppercase text-(--jbc-neon)">{loading ? "Loading Images" : card.caption}</p>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-display text-xl uppercase leading-tight text-foreground">{card.caption}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/72">{card.mood}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="culture" className="mx-auto w-full max-w-6xl px-5 pb-4 pt-16 sm:px-8 md:px-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-script text-3xl text-(--jbc-neon)">Culture</p>
              <h2 className="font-display text-[clamp(1.9rem,5vw,3.2rem)] leading-[0.95] uppercase">Cow Conversations and Facts</h2>
            </div>
            <div className="hidden items-center gap-2 border border-(--jbc-neon) px-3 py-2 text-xs uppercase tracking-[0.12em] text-(--jbc-neon) md:inline-flex">
              <Newspaper className="size-3" />
              Live Sources
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55 }}
              className="border border-white/20 bg-[#0b0d0b] p-5"
            >
              <h3 className="font-display text-2xl uppercase text-foreground">Reddit Discussions</h3>
              <p className="mt-2 text-sm text-white/70">Recent cow posts and community conversations from open Reddit feeds.</p>

              <div className="mt-4 space-y-3">
                {discussionItems.map((item) => (
                  <button
                    key={item.link}
                    type="button"
                    onClick={() => setPendingDiscussionRedirect(item)}
                    className="block border border-white/15 bg-black/35 p-3 transition-colors hover:border-(--jbc-neon)"
                  >
                    <p className="font-display text-lg uppercase leading-tight text-foreground">{item.title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.11em] text-white/62">
                      {item.subreddit} {item.score > 0 ? `- score ${item.score}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            </motion.article>

            <motion.article
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="border border-white/20 bg-[#0b0d0b] p-5"
            >
              <h3 className="font-display text-2xl uppercase text-foreground">Cow Facts</h3>
              <p className="mt-2 text-sm text-white/70">Open fact snippets from Wikipedia summaries focused on cattle and breeds.</p>

              <div className="mt-4 space-y-3">
                {factItems.map((fact) => (
                  <article key={fact.title} className="border border-white/15 bg-black/35 p-3">
                    <h4 className="font-display text-base uppercase text-(--jbc-neon)">{fact.title}</h4>
                    <p className="mt-1 text-sm leading-relaxed text-white/78">{fact.detail}</p>
                    <a
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs uppercase tracking-[0.12em] text-white/60 transition-colors hover:text-(--jbc-neon)"
                    >
                      Source
                    </a>
                  </article>
                ))}
              </div>

              {cultureLoading ? (
                <p className="mt-3 text-xs uppercase tracking-[0.12em] text-white/52">Refreshing open sources...</p>
              ) : null}
            </motion.article>
          </div>
        </section>

        <section id="join" className="relative mt-16 overflow-hidden border-y-2 border-background bg-(--jbc-neon) text-background">
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.08)_0,rgba(0,0,0,0.08)_1px,transparent_1px,transparent_28px)]" />
          <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:px-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6 }}
            >
              <p className="font-script text-4xl text-black">Join JBC</p>
              <h3 className="font-display mt-2 text-[clamp(2.1rem,6vw,4.2rem)] uppercase leading-[0.9]">
                Monthly Cow Journal
              </h3>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-black/80">
                Receive thoughtful updates on cow photography, breed personality notes, symbolism in art, and
                remarkable field sightings.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              onSubmit={(event) => {
                event.preventDefault();
                setJoinSuccess(true);
              }}
              className="border-2 border-black bg-foreground p-4"
            >
              <label htmlFor="jbc-email" className="mb-2 block text-xs uppercase tracking-[0.15em] text-black/75">
                Your Email
              </label>
              <input
                id="jbc-email"
                name="email"
                type="email"
                required
                placeholder="you@moo-mail.com"
                className="mb-3 h-12 w-full border border-black bg-white px-3 text-sm text-black placeholder:text-black/45 focus:border-black focus:outline-none"
              />

              <Button type="submit" className="w-full border border-black bg-black text-(--jbc-neon) shadow-[4px_4px_0_#111] hover:shadow-[6px_6px_0_#111]">
                Join JBC
                <Zap className="size-4" />
              </Button>

              <p className="mt-3 text-xs uppercase tracking-[0.11em] text-black/70">
                {joinSuccess ? "Thank you. You are now subscribed to JBC." : "No spam. One concise update each month."}
              </p>
            </motion.form>
          </div>
        </section>
      </main>

      {pendingDiscussionRedirect ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4"
          onClick={() => setPendingDiscussionRedirect(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="discussion-redirect-title"
            className="w-full max-w-lg border-2 border-(--jbc-neon) bg-[#0b0d0b] p-5 shadow-[8px_8px_0_var(--jbc-neon)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="font-script text-3xl text-(--jbc-neon)">Leave JBC?</p>
            <h3 id="discussion-redirect-title" className="font-display mt-1 text-2xl uppercase text-foreground">
              Open Reddit Discussion
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/78">
              You are about to open a post on {pendingRedirectHost}. Continue to the external page?
            </p>
            <p className="mt-2 text-xs uppercase tracking-[0.11em] text-white/58">
              {pendingDiscussionRedirect.title}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button type="button" onClick={confirmDiscussionRedirect}>
                Continue
                <ArrowRight className="size-4" />
              </Button>
              <Button type="button" variant="outline" onClick={() => setPendingDiscussionRedirect(null)}>
                Stay on JBC
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
