import { createAppleClientService, type AppMetadata, type AppReview, type RelatedApp } from './apple-client';

export type MarketSignalEvidence = {
  recentReviews: AppReview[];
  relatedApps: RelatedApp[];
  evidenceNotes: string[];
};

export async function collectMarketSignalEvidence(
  app: Pick<AppMetadata, 'appStoreId' | 'name' | 'country'>,
): Promise<MarketSignalEvidence> {
  const client = createAppleClientService();
  const [reviews, relatedApps] = await Promise.allSettled([
    client.getRecentReviews(app.appStoreId, { country: app.country, limit: 5 }),
    client.searchRelatedApps(app.name, {
      country: app.country,
      excludedAppStoreId: app.appStoreId,
      limit: 4,
    }),
  ]);

  const evidenceNotes: string[] = [];
  if (reviews.status === 'rejected') {
    evidenceNotes.push('Recent App Store review sample could not be retrieved.');
  }
  if (relatedApps.status === 'rejected') {
    evidenceNotes.push('Related App Store search sample could not be retrieved.');
  }

  return {
    recentReviews: reviews.status === 'fulfilled' ? reviews.value : [],
    relatedApps: relatedApps.status === 'fulfilled' ? relatedApps.value : [],
    evidenceNotes,
  };
}
