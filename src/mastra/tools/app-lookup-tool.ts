import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createAppleClientService, parseAppStoreUrl, validateAppStoreId } from '../services/apple-client';

export function parseAppLookupInput(input: string): { appStoreId: string; country: string | null; url: string | null } {
  const trimmedInput = input.trim();

  if (/^\d+$/.test(trimmedInput)) {
    return {
      appStoreId: validateAppStoreId(trimmedInput),
      country: null,
      url: null,
    };
  }

  const parsedUrl = parseAppStoreUrl(trimmedInput);

  return {
    ...parsedUrl,
    url: trimmedInput,
  };
}

export async function lookupAppMetadata(input: string) {
  const { appStoreId, country, url } = parseAppLookupInput(input);
  const appleClient = createAppleClientService();
  const metadata = await appleClient.lookupApp(appStoreId, { country });

  return {
    ...metadata,
    input,
    url,
    developer: metadata.developer ?? 'Unknown developer',
    icon: metadata.artworkUrl512 ?? '',
    category: metadata.category ?? 'Unknown category',
    country: metadata.country ?? country ?? 'unknown',
  };
}

export const appLookupTool = createTool({
  id: 'app-lookup',
  description: 'Fetch App Store metadata for an iOS app by App Store URL or numeric Apple App Store ID.',
  strict: true,
  inputSchema: z.object({
    input: z.string().min(1).describe('An App Store URL or numeric Apple App Store app ID'),
  }),
  outputSchema: z.object({
    appStoreId: z.string(),
    name: z.string(),
    developer: z.string(),
    icon: z.string(),
    category: z.string(),
    country: z.string(),
    input: z.string(),
    url: z.string().nullable(),
    description: z.string().nullable(),
    artworkUrl512: z.string().nullable(),
    averageUserRating: z.number().nullable(),
    userRatingCount: z.number().nullable(),
    version: z.string().nullable(),
    price: z.number().nullable(),
    currency: z.string().nullable(),
    formattedPrice: z.string().nullable(),
    rawLookupJson: z.string(),
  }),
  execute: async ({ input }) => {
    return lookupAppMetadata(input);
  },
});
