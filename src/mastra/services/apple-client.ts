export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type AppMetadata = {
  appStoreId: string;
  name: string;
  developer: string | null;
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
  rawLookupJson: string;
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
    developer: getString(result, 'sellerName') ?? getString(result, 'artistName'),
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
    rawLookupJson: JSON.stringify(result),
  };
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

function getInteger(record: Record<string, unknown>, key: string): number | null {
  const value = getNumber(record, key);
  return value !== null && Number.isInteger(value) ? value : null;
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
