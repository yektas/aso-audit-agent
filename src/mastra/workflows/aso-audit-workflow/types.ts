import { z } from "zod";

export const workflowInputSchema = z.object({
  app: z.string().min(1).describe("An App Store URL or numeric Apple App Store app ID"),
});

export const appMetadataSchema = z.object({
  appStoreId: z.string(),
  name: z.string(),
  developer: z.string(),
  icon: z.string(),
  category: z.string(),
  country: z.string(),
  description: z.string().nullable(),
  averageUserRating: z.number().nullable(),
  userRatingCount: z.number().nullable(),
  version: z.string().nullable(),
  price: z.number().nullable(),
  currency: z.string().nullable(),
  formattedPrice: z.string().nullable(),
  rawLookupJson: z.string(),
  input: z.string(),
  url: z.string().nullable(),
});

export const confirmationOutputSchema = appMetadataSchema.extend({
  confirmed: z.boolean(),
});

export const workflowOutputSchema = z.object({
  recommendations: z.string(),
});
