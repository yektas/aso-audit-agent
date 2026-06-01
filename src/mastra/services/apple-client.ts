export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type AppMetadata = {
  appStoreId: string;
  name: string;
  appStoreUrl: string | null;
  bundleId: string | null;
  developer: string | null;
  developerUrl: string | null;
  description: string | null;
  artworkUrl512: string | null;
  category: string | null;
  country: string | null;
  averageUserRating: number | null;
  userRatingCount: number | null;
  version: string | null;
  price: number | null;
  currency: string | null;
  formattedPrice: string | null;
  screenshotUrls: string[];
  ipadScreenshotUrls: string[];
  appletvScreenshotUrls: string[];
  genres: string[];
  releaseNotes: string | null;
  releaseDate: string | null;
  currentVersionReleaseDate: string | null;
  contentRating: string | null;
  contentAdvisories: string[];
  languageCodes: string[];
  features: string[];
  minimumOsVersion: string | null;
  currentVersionAverageRating: number | null;
  currentVersionRatingCount: number | null;
  rawLookupJson: string;
};

export type AppReview = {
  title: string;
  rating: number;
  content: string;
};

export type RelatedApp = {
  appStoreId: string;
  name: string;
  developer: string | null;
  category: string | null;
  averageUserRating: number | null;
  userRatingCount: number | null;
};

export class AppStoreValidationError extends Error {
  constructor(message = 'App Store ID must be a string containing only digits') {
    super(message);
    this.name = 'AppStoreValidationError';
  }
}

export class AppLookupNotFoundError extends Error {
  constructor(appStoreId: string) {
    super(`No App Store app found for ID ${appStoreId}`);
    this.name = 'AppLookupNotFoundError';
  }
}

export class AppleUpstreamError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AppleUpstreamError';
    this.cause = cause;
  }
}

export function validateAppStoreId(appStoreId: unknown): string {
  if (typeof appStoreId !== 'string' || !/^\d+$/.test(appStoreId)) {
    throw new AppStoreValidationError();
  }

  return appStoreId;
}

export function parseAppStoreUrl(appStoreUrl: string): { appStoreId: string; country: string | null } {
  let url: URL;

  try {
    url = new URL(appStoreUrl);
  } catch {
    throw new AppStoreValidationError('App Store URL must be a valid URL');
  }

  const host = url.hostname.toLowerCase();

  if (!['apps.apple.com', 'itunes.apple.com'].includes(host)) {
    throw new AppStoreValidationError('App Store URL must use apps.apple.com or itunes.apple.com');
  }

  const idMatch = url.pathname.match(/\/id(\d+)(?:\/|$)/);

  if (!idMatch) {
    throw new AppStoreValidationError('App Store URL must contain an /id123456789 app identifier');
  }

  const [firstPathSegment] = url.pathname.split('/').filter(Boolean);
  const country = firstPathSegment && /^[a-z]{2}$/i.test(firstPathSegment) ? firstPathSegment.toLowerCase() : null;

  return {
    appStoreId: idMatch[1],
    country,
  };
}

export type AppleClientService = ReturnType<typeof createAppleClientService>;

export function createAppleClientService(fetcher: FetchLike = fetch) {
  return {
    async lookupApp(appStoreId: string, options: { country?: string | null } = {}): Promise<AppMetadata> {
      validateAppStoreId(appStoreId);

      const url = new URL('https://itunes.apple.com/lookup');
      url.searchParams.set('id', appStoreId);

      if (options.country) {
        url.searchParams.set('country', options.country);
      }

      const payload = await fetchJson(fetcher, url, 'lookup');
      return normalizeLookupPayload(appStoreId, payload, options.country ?? null);
    },

    async getRecentReviews(
      appStoreId: string,
      options: { country?: string | null; limit?: number } = {},
    ): Promise<AppReview[]> {
      validateAppStoreId(appStoreId);

      const country = normalizeCountry(options.country);
      const url = new URL(`https://itunes.apple.com/${country}/rss/customerreviews/id=${appStoreId}/sortBy=mostRecent/json`);
      const payload = await fetchJson(fetcher, url, 'review feed');
      return normalizeReviewPayload(payload).slice(0, options.limit ?? 5);
    },

    async searchRelatedApps(
      term: string,
      options: { country?: string | null; excludedAppStoreId?: string; limit?: number } = {},
    ): Promise<RelatedApp[]> {
      const url = new URL('https://itunes.apple.com/search');
      url.searchParams.set('term', term);
      url.searchParams.set('country', normalizeCountry(options.country));
      url.searchParams.set('entity', 'software');
      url.searchParams.set('limit', String((options.limit ?? 4) + 1));

      const payload = await fetchJson(fetcher, url, 'related app search');
      return normalizeRelatedAppsPayload(payload)
        .filter((app) => app.appStoreId !== options.excludedAppStoreId)
        .slice(0, options.limit ?? 4);
    },
  };
}

async function fetchJson(fetcher: FetchLike, input: string | URL, label: string): Promise<unknown> {
  let response: Response;

  try {
    response = await fetcher(input);
  } catch (error) {
    throw new AppleUpstreamError(`Apple ${label} request failed`, error);
  }

  if (!response.ok) {
    throw new AppleUpstreamError(`Apple ${label} request returned HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new AppleUpstreamError(`Apple ${label} response was not valid JSON`, error);
  }
}

export function normalizeLookupPayload(
  requestedAppStoreId: string,
  payload: unknown,
  country: string | null = null,
): AppMetadata {
  if (!isRecord(payload)) {
    throw new AppleUpstreamError('Apple lookup response was malformed');
  }

  const resultCount = payload.resultCount;
  const results = payload.results;

  if (resultCount === 0 && Array.isArray(results) && results.length === 0) {
    throw new AppLookupNotFoundError(requestedAppStoreId);
  }

  if (resultCount !== 1 || !Array.isArray(results) || results.length !== 1) {
    throw new AppleUpstreamError('Apple lookup response did not contain exactly one app result');
  }

  const result = results[0];

  if (!isRecord(result)) {
    throw new AppleUpstreamError('Apple lookup app result was malformed');
  }

  const trackId = stringFromNumberOrString(result.trackId);
  const name = getString(result, 'trackName');

  if (!trackId || !name) {
    throw new AppleUpstreamError('Apple lookup app result was missing required fields');
  }

  return {
    appStoreId: trackId,
    name,
    appStoreUrl: getString(result, 'trackViewUrl'),
    bundleId: getString(result, 'bundleId'),
    developer: getString(result, 'sellerName') ?? getString(result, 'artistName'),
    developerUrl: getString(result, 'sellerUrl') ?? getString(result, 'artistViewUrl'),
    description: getString(result, 'description'),
    artworkUrl512: getString(result, 'artworkUrl512'),
    category: getString(result, 'primaryGenreName'),
    country,
    averageUserRating: getNumber(result, 'averageUserRating'),
    userRatingCount: getInteger(result, 'userRatingCount'),
    version: getString(result, 'version'),
    price: getNumber(result, 'price'),
    currency: getString(result, 'currency'),
    formattedPrice: getString(result, 'formattedPrice'),
    screenshotUrls: getStringArray(result, 'screenshotUrls'),
    ipadScreenshotUrls: getStringArray(result, 'ipadScreenshotUrls'),
    appletvScreenshotUrls: getStringArray(result, 'appletvScreenshotUrls'),
    genres: getStringArray(result, 'genres'),
    releaseNotes: getString(result, 'releaseNotes'),
    releaseDate: getString(result, 'releaseDate'),
    currentVersionReleaseDate: getString(result, 'currentVersionReleaseDate'),
    contentRating: getString(result, 'contentAdvisoryRating') ?? getString(result, 'trackContentRating'),
    contentAdvisories: getStringArray(result, 'advisories'),
    languageCodes: getStringArray(result, 'languageCodesISO2A'),
    features: getStringArray(result, 'features'),
    minimumOsVersion: getString(result, 'minimumOsVersion'),
    currentVersionAverageRating: getNumber(result, 'averageUserRatingForCurrentVersion'),
    currentVersionRatingCount: getInteger(result, 'userRatingCountForCurrentVersion'),
    rawLookupJson: JSON.stringify(result),
  };
}

export function normalizeReviewPayload(payload: unknown): AppReview[] {
  if (!isRecord(payload) || !isRecord(payload.feed) || !Array.isArray(payload.feed.entry)) {
    throw new AppleUpstreamError('Apple review feed response was malformed');
  }

  return payload.feed.entry.flatMap((entry) => {
    if (!isRecord(entry) || !isRecord(entry['im:rating'])) {
      return [];
    }

    const rating = Number(getString(entry['im:rating'], 'label'));
    const title = isRecord(entry.title) ? getString(entry.title, 'label') : null;
    const content = isRecord(entry.content) ? getString(entry.content, 'label') : null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !title || !content) {
      return [];
    }

    return [{ title, rating, content: content.slice(0, 500) }];
  });
}

export function normalizeRelatedAppsPayload(payload: unknown): RelatedApp[] {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new AppleUpstreamError('Apple related app search response was malformed');
  }

  return payload.results.flatMap((result) => {
    if (!isRecord(result)) {
      return [];
    }

    const appStoreId = stringFromNumberOrString(result.trackId);
    const name = getString(result, 'trackName');
    if (!appStoreId || !name) {
      return [];
    }

    return [{
      appStoreId,
      name,
      developer: getString(result, 'sellerName') ?? getString(result, 'artistName'),
      category: getString(result, 'primaryGenreName'),
      averageUserRating: getNumber(result, 'averageUserRating'),
      userRatingCount: getInteger(result, 'userRatingCount'),
    }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function getNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getInteger(record: Record<string, unknown>, key: string): number | null {
  const value = getNumber(record, key);
  return value !== null && Number.isInteger(value) ? value : null;
}

function normalizeCountry(country: string | null | undefined): string {
  return country && /^[a-z]{2}$/i.test(country) ? country.toLowerCase() : 'us';
}

function stringFromNumberOrString(value: unknown): string | null {
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value);
  }

  return null;
}
