import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

import { runFullAsoAudit } from "../../services/aso-audit";
import { lookupAppMetadata } from "../../tools/app-lookup-tool";
import { appMetadataSchema, confirmationOutputSchema, workflowOutputSchema } from "./types";

export const fetchMetadataStep = createStep({
  id: "fetch-metadata",
  inputSchema: z.object({
    app: z.string().min(1),
  }),
  outputSchema: appMetadataSchema,
  execute: async ({ inputData }) => {
    return lookupAppMetadata(inputData.app);
  },
});

export const confirmationStep = createStep({
  id: "user-confirmation",
  inputSchema: appMetadataSchema,
  outputSchema: confirmationOutputSchema,
  suspendSchema: z.object({
    message: z.string(),
    appStoreId: z.string(),
    name: z.string(),
    developer: z.string(),
    icon: z.string(),
    category: z.string(),
    country: z.string(),
  }),
  resumeSchema: z.object({
    confirmed: z.boolean(),
  }),
  execute: async ({ inputData, resumeData, suspend, bail }) => {
    if (resumeData?.confirmed === false) {
      return bail({
        confirmed: false,
        ...inputData,
      });
    }

    if (resumeData?.confirmed === true) {
      return {
        confirmed: true,
        ...inputData,
      };
    }

    return await suspend({
      message: "Is this the app you meant?",
      name: inputData.name,
      developer: inputData.developer,
      icon: inputData.icon,
      category: inputData.category,
      country: inputData.country,
      appStoreId: inputData.appStoreId,
    });
  },
});

export const fullAuditStep = createStep({
  id: "full-aso-audit",
  inputSchema: confirmationOutputSchema,
  outputSchema: workflowOutputSchema,
  execute: async ({ inputData }) => {
    const audit = await runFullAsoAudit({
      appStoreId: inputData.appStoreId,
      name: inputData.name,
      developer: inputData.developer,
      description: inputData.description,
      artworkUrl512: inputData.icon || null,
      category: inputData.category,
      country: inputData.country,
      averageUserRating: inputData.averageUserRating,
      userRatingCount: inputData.userRatingCount,
      version: inputData.version,
      price: inputData.price,
      currency: inputData.currency,
      formattedPrice: inputData.formattedPrice,
      rawLookupJson: inputData.rawLookupJson,
    });

    return {
      recommendations:
        audit.recommendations.length > 0
          ? audit.recommendations
              .map(
                (recommendation) =>
                  `${recommendation.priority.toUpperCase()}: ${recommendation.title} - ${recommendation.rationale}`,
              )
              .join("\n")
          : `ASO audit complete for ${inputData.name} by ${inputData.developer}. ${audit.note}`,
    };
  },
});
