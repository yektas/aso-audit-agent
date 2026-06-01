import type { AppMetadata } from './apple-client';

export type AsoAuditRecommendation = {
  title: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high';
};

export type AsoAuditResult = {
  appStoreId: string;
  status: 'not_implemented';
  recommendations: AsoAuditRecommendation[];
  note: string;
};

export async function runFullAsoAudit(app: AppMetadata): Promise<AsoAuditResult> {
  // TODO: Implement the full ASO audit engine in a later pass.
  return {
    appStoreId: app.appStoreId,
    status: 'not_implemented',
    recommendations: [],
    note: 'Full ASO audit execution is wired, but the audit engine has not been implemented yet.',
  };
}
