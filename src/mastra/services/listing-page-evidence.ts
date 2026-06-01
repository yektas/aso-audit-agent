import { z } from 'zod';

import type { AppMetadata } from './apple-client';
import { listingPageEvidenceSchema } from '../workflows/listing-audit/schemas';

export type ListingPageEvidence = z.infer<typeof listingPageEvidenceSchema>;
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

const FIRECRAWL_SCRAPE_URL = 'https://api.firecrawl.dev/v2/scrape';
const RAW_MARKDOWN_LIMIT = 4_000;

export class MissingFirecrawlApiKeyError extends Error {
  constructor() {
    super('FIRECRAWL_API_KEY is required to collect public App Store listing page evidence.');
    this.name = 'MissingFirecrawlApiKeyError';
  }
}

const firecrawlListingJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subtitle: {
      type: ['string', 'null'],
      description: 'The public App Store subtitle/tagline visible near the app title, if present.',
    },
    promotionalText: {
      type: ['string', 'null'],
      description: 'The public promotional text section content, if present.',
    },
    inAppEvents: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          description: { type: ['string', 'null'] },
        },
        required: ['title', 'description'],
      },
      description: 'Public in-app event cards visible on the listing page.',
    },
  },
  required: ['subtitle', 'promotionalText', 'inAppEvents'],
} as const;

const firecrawlListingJsonOutputSchema = z.object({
  subtitle: z.string().nullable().catch(null),
  promotionalText: z.string().nullable().catch(null),
  inAppEvents: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().nullable().catch(null),
      }),
    )
    .catch([]),
});

const emptyListingPageEvidence = (crawlNotes: string[]): ListingPageEvidence => ({
  subtitle: null,
  promotionalText: null,
  screenshotImageUrls: [],
  inAppEvents: [],
  crawlNotes,
  unavailablePrivateMetadata: [
    'iOS keyword field is private App Store Connect metadata.',
    'Custom product pages are private App Store Connect metadata.',
    'Developer review responses are not collected in listing page evidence v1.',
  ],
  rawMarkdown: null,
});

export async function collectListingPageEvidence(
  app: Pick<AppMetadata, 'appStoreUrl' | 'name'>,
  fetcher: FetchLike = fetch,
): Promise<ListingPageEvidence> {
  if (!app.appStoreUrl) {
    return emptyListingPageEvidence(['Public App Store listing URL was unavailable, so Firecrawl was skipped.']);
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new MissingFirecrawlApiKeyError();
  }

  try {
    const response = await fetcher(FIRECRAWL_SCRAPE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: app.appStoreUrl,
        onlyMainContent: true,
        maxAge: 172_800_000,
        parsers: [],
        formats: [
          'markdown',
          'html',
          {
            type: 'json',
            schema: firecrawlListingJsonSchema,
            prompt: [
              'Extract only public App Store listing fields that are visibly present on this page.',
              'Use null for absent subtitle or promotional text.',
              'Use an empty array when in-app events are not visibly present.',
              'Do not infer private App Store Connect metadata such as keyword fields or custom product pages.',
            ].join(' '),
          },
        ],
      }),
    });

    if (!response.ok) {
      return emptyListingPageEvidence([`Firecrawl listing page crawl returned HTTP ${response.status}.`]);
    }

    const payload: unknown = await response.json();
    const markdown = extractMarkdown(payload);
    const html = extractHtml(payload);
    const jsonEvidence = extractJsonEvidence(payload);

    if (!markdown && !html && !jsonEvidence) {
      return emptyListingPageEvidence(['Firecrawl listing page crawl completed without usable markdown, HTML, or JSON evidence.']);
    }

    const markdownEvidence = markdown ? extractTypedListingEvidenceFromMarkdown(markdown, app.name) : null;
    const typedEvidence = mergeListingEvidence(jsonEvidence, markdownEvidence);
    const screenshotImageUrls = html ? extractScreenshotImageUrlsFromHtml(html) : [];
    const crawlNotes = [
      jsonEvidence
        ? 'Firecrawl public listing page JSON evidence was collected; markdown filled any missing public fields.'
        : 'Firecrawl public listing page JSON evidence was unavailable; markdown fallback was used.',
      screenshotImageUrls.length > 0
        ? `Firecrawl HTML screenshot section yielded ${screenshotImageUrls.length} screenshot image URL${screenshotImageUrls.length === 1 ? '' : 's'}.`
        : 'Firecrawl HTML screenshot section did not yield screenshot image URLs.',
    ];

    return {
      ...emptyListingPageEvidence(crawlNotes),
      ...typedEvidence,
      screenshotImageUrls,
      rawMarkdown: markdown ? markdown.slice(0, RAW_MARKDOWN_LIMIT) : null,
    };
  } catch {
    return emptyListingPageEvidence(['Firecrawl listing page crawl failed and was skipped.']);
  }
}

function extractMarkdown(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.markdown === 'string') {
    return payload.markdown;
  }

  if (isRecord(payload.data) && typeof payload.data.markdown === 'string') {
    return payload.data.markdown;
  }

  return null;
}

function extractHtml(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.html === 'string') {
    return payload.html;
  }

  if (isRecord(payload.data) && typeof payload.data.html === 'string') {
    return payload.data.html;
  }

  return null;
}

function extractJsonEvidence(payload: unknown): Pick<
  ListingPageEvidence,
  'subtitle' | 'promotionalText' | 'inAppEvents'
> | null {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return null;
  }

  const result = firecrawlListingJsonOutputSchema.safeParse(payload.data.json);
  if (!result.success) {
    return null;
  }

  return result.data;
}

function extractTypedListingEvidenceFromMarkdown(markdown: string, appName: string): Pick<
  ListingPageEvidence,
  'subtitle' | 'promotionalText' | 'inAppEvents'
> {
  return {
    subtitle: extractSubtitle(markdown, appName),
    promotionalText: extractPromotionalText(markdown),
    inAppEvents: extractInAppEvents(markdown),
  };
}

function mergeListingEvidence(
  jsonEvidence: Pick<ListingPageEvidence, 'subtitle' | 'promotionalText' | 'inAppEvents'> | null,
  markdownEvidence: Pick<ListingPageEvidence, 'subtitle' | 'promotionalText' | 'inAppEvents'> | null,
): Pick<ListingPageEvidence, 'subtitle' | 'promotionalText' | 'inAppEvents'> | null {
  if (!jsonEvidence) {
    return markdownEvidence;
  }

  if (!markdownEvidence) {
    return jsonEvidence;
  }

  return {
    subtitle: jsonEvidence.subtitle ?? markdownEvidence.subtitle,
    promotionalText: jsonEvidence.promotionalText ?? markdownEvidence.promotionalText,
    inAppEvents: jsonEvidence.inAppEvents.length > 0 ? jsonEvidence.inAppEvents : markdownEvidence.inAppEvents,
  };
}

function extractScreenshotImageUrlsFromHtml(html: string): string[] {
  const screenshotContexts = Array.from(html.matchAll(/screenshots?/gi), (match) => {
    const start = Math.max(0, match.index - 20_000);
    const end = Math.min(html.length, match.index + 80_000);
    return html.slice(start, end);
  });
  const sourceHtml = screenshotContexts.length > 0 ? screenshotContexts.join('\n') : html;

  return dedupeImageUrlsByAsset(extractImageUrlsFromHtml(sourceHtml).filter(isLikelyAppScreenshotUrl)).slice(0, 10);
}

function extractImageUrlsFromHtml(html: string): string[] {
  const values = [
    ...Array.from(html.matchAll(/\s(?:src|data-src)=["']([^"']+)["']/gi), ([, value]) => value),
    ...Array.from(html.matchAll(/\s(?:srcset|data-srcset)=["']([^"']+)["']/gi), ([, value]) => value)
      .flatMap((srcset) => srcset.split(','))
      .map((candidate) => candidate.trim().split(/\s+/)[0])
      .filter(Boolean),
  ];

  return values
    .map(decodeHtmlAttribute)
    .filter((value, index, urls) => {
      try {
        new URL(value);
        return urls.indexOf(value) === index;
      } catch {
        return false;
      }
    });
}

function isLikelyAppScreenshotUrl(url: string): boolean {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!parsed.hostname.endsWith('mzstatic.com')) {
    return false;
  }

  const path = parsed.pathname.toLowerCase();
  if (!path.includes('/image/thumb/')) {
    return false;
  }

  const dimensions = getImageUrlDimensions(parsed);
  if (!dimensions) {
    return true;
  }

  const { width, height } = dimensions;
  const smallerSide = Math.min(width, height);
  const largerSide = Math.max(width, height);
  const aspectRatio = largerSide / smallerSide;

  return smallerSide >= 150 && aspectRatio >= 1.2;
}

function dedupeImageUrlsByAsset(urls: string[]): string[] {
  const bestByAsset = new Map<string, { url: string; area: number }>();

  for (const url of urls) {
    const assetKey = getImageAssetKey(url);
    const dimensions = getImageUrlDimensions(url);
    const area = dimensions ? dimensions.width * dimensions.height : 0;
    const existing = bestByAsset.get(assetKey);

    if (!existing || area > existing.area) {
      bestByAsset.set(assetKey, { url, area });
    }
  }

  return Array.from(bestByAsset.values(), ({ url }) => url);
}

function getImageAssetKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(/\/\d+x\d+[^/]*$/, '');
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function getImageUrlDimensions(url: string | URL): { width: number; height: number } | null {
  const pathname = url instanceof URL ? url.pathname : new URL(url).pathname;
  const match = pathname.match(/\/(\d+)x(\d+)[^/]*$/);

  if (!match) {
    return null;
  }

  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractSubtitle(markdown: string, appName: string): string | null {
  const lines = normalizeLines(markdown);
  const headingIndex = lines.findIndex((line) => stripMarkdown(line).toLowerCase() === appName.toLowerCase());

  if (headingIndex === -1) {
    return null;
  }

  const candidate = lines
    .slice(headingIndex + 1, headingIndex + 5)
    .map(stripMarkdown)
    .find((line) => line && !isLikelyNavigationOrMetric(line) && line.length <= 80);

  return candidate ?? null;
}

function extractPromotionalText(markdown: string): string | null {
  const lines = normalizeLines(markdown).map(stripMarkdown);
  const promoIndex = lines.findIndex((line) => /^promotional text$/i.test(line));

  if (promoIndex === -1) {
    return null;
  }

  return lines.slice(promoIndex + 1).find((line) => line && !isLikelySectionHeading(line)) ?? null;
}

function extractInAppEvents(markdown: string): Array<{ title: string; description: string | null }> {
  const lines = normalizeLines(markdown).map(stripMarkdown);
  const eventsIndex = lines.findIndex((line) => /^in-app events$/i.test(line));

  if (eventsIndex === -1) {
    return [];
  }

  const eventLines = lines.slice(eventsIndex + 1, eventsIndex + 12).filter((line) => line && !isLikelySectionHeading(line));
  if (eventLines.length === 0) {
    return [];
  }

  return [
    {
      title: eventLines[0],
      description: eventLines[1] ?? null,
    },
  ];
}

function normalizeLines(markdown: string): string[] {
  return markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .trim();
}

function isLikelyNavigationOrMetric(line: string): boolean {
  return /^(open|age rating|chart|free|offers|screenshots|description|what's new|ratings and reviews|privacy|information)$/i.test(line);
}

function isLikelySectionHeading(line: string): boolean {
  return /^(screenshots|description|what's new|ratings and reviews|app privacy|information|supports|you might also like)$/i.test(line);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
