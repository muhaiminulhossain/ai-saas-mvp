import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { addSource } from "@/lib/sources";

type UrlSourceRequest = {
  url?: string;
  crawlDepth?: number;
  includeSubpages?: boolean;
  notes?: string;
};

type CrawledPage = {
  url: string;
  title: string;
  description: string;
  content: string;
};

const MAX_PAGES = 12;
const MAX_CONTENT_LENGTH = 12000;

function normalizeUrl(input: string): string {
  const url = new URL(input.trim());
  url.hash = "";
  return url.toString();
}

function isSameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ")
    .replace(/<img[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || "Untitled";
}

function extractMetaDescription(html: string): string {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"]*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"]*)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"]*)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"]*)["'][^>]+property=["']og:description["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function extractLinks(html: string, baseUrl: string): string[] {
  const matches = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)];
  const links = new Set<string>();

  for (const match of matches) {
    const rawHref = match[1]?.trim();
    if (!rawHref) continue;
    if (
      rawHref.startsWith("mailto:") ||
      rawHref.startsWith("tel:") ||
      rawHref.startsWith("javascript:")
    ) {
      continue;
    }

    try {
      const absolute = new URL(rawHref, baseUrl);
      absolute.hash = "";
      links.add(absolute.toString());
    } catch {
      continue;
    }
  }

  return [...links];
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ai-saas-mvp-bot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Website returned ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Website did not return HTML. Received: ${contentType || "unknown"}`);
  }

  const html = await response.text();
  return {
    html,
    finalUrl: response.url || url,
  };
}

async function fetchPage(url: string): Promise<CrawledPage> {
  const { html, finalUrl } = await fetchHtml(url);

  return {
    url: finalUrl,
    title: extractTitle(html),
    description: extractMetaDescription(html),
    content: stripHtml(html).slice(0, MAX_CONTENT_LENGTH),
  };
}

async function crawlSite(
  startUrl: string,
  crawlDepth: number,
  includeSubpages: boolean
): Promise<CrawledPage[]> {
  const normalizedStartUrl = normalizeUrl(startUrl);
  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [
    { url: normalizedStartUrl, depth: 0 },
  ];
  const pages: CrawledPage[] = [];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const current = queue.shift();
    if (!current) break;

    const currentUrl = normalizeUrl(current.url);
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);

    try {
      const { html, finalUrl } = await fetchHtml(currentUrl);

      pages.push({
        url: finalUrl,
        title: extractTitle(html),
        description: extractMetaDescription(html),
        content: stripHtml(html).slice(0, MAX_CONTENT_LENGTH),
      });

      if (!includeSubpages || current.depth >= crawlDepth) {
        continue;
      }

      const links = extractLinks(html, finalUrl);

      for (const link of links) {
        if (!isSameOrigin(link, normalizedStartUrl)) continue;
        if (visited.has(link)) continue;
        if (queue.length + pages.length >= MAX_PAGES * 3) continue;

        queue.push({
          url: link,
          depth: current.depth + 1,
        });
      }
    } catch {
      continue;
    }
  }

  return pages;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UrlSourceRequest;

    const rawUrl = body.url?.trim();
    const crawlDepth =
      typeof body.crawlDepth === "number" && body.crawlDepth >= 0
        ? Math.min(body.crawlDepth, 4)
        : 1;
    const includeSubpages = Boolean(body.includeSubpages);
    const notes = body.notes?.trim() || "";

    if (!rawUrl) {
      return NextResponse.json(
        { success: false, error: "Missing URL" },
        { status: 400 }
      );
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeUrl(rawUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid URL. Please include https://" },
        { status: 400 }
      );
    }

    let pages: CrawledPage[] = [];

    try {
      pages = includeSubpages
        ? await crawlSite(normalizedUrl, crawlDepth, includeSubpages)
        : [await fetchPage(normalizedUrl)];
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not fetch website";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    if (pages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not extract readable website content. Try crawl depth 1 or disable subpages.",
        },
        { status: 400 }
      );
    }

    const primaryPage = pages[0];
    const sourceId = crypto.randomUUID();

    const storageDir = path.join(process.cwd(), "data", "url-sources");
    await fs.mkdir(storageDir, { recursive: true });

    const createdAt = new Date().toISOString();

    const snapshot = {
      id: sourceId,
      sourceType: "url",
      url: normalizedUrl,
      crawlDepth,
      includeSubpages,
      notes,
      pageCount: pages.length,
      createdAt,
      pages,
      marketingPotential: {
        canGenerateSocialContent: true,
        canGenerateLinkedInContent: true,
        canExtractCatalogSignals: true,
      },
    };

    const fileName = `${sourceId}.json`;
    const absolutePath = path.join(storageDir, fileName);
    const relativePath = path.join("data", "url-sources", fileName);

    await fs.writeFile(absolutePath, JSON.stringify(snapshot, null, 2), "utf-8");

    await addSource({
      id: sourceId,
      name: primaryPage.title || normalizedUrl,
      type: "url",
      createdAt,
      filePath: relativePath,
      meta: {
        originalUrl: normalizedUrl,
        pageCount: pages.length,
        notes,
      },
    });

    return NextResponse.json({
      success: true,
      source: {
        id: sourceId,
        name: primaryPage.title || normalizedUrl,
        type: "url",
        createdAt,
      },
      summary: {
        url: normalizedUrl,
        title: primaryPage.title,
        description: primaryPage.description,
        pageCount: pages.length,
      },
    });
  } catch (error) {
    console.error("POST /api/sources/url failed:", error);

    const message =
      error instanceof Error ? error.message : "Failed to add website source";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}