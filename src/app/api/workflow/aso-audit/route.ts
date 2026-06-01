import { handleAsoAuditWorkflowResume, type AsoAuditWorkflowResumeParams } from '@/lib/aso-audit-workflow-resume'

export async function POST(req: Request) {
  const params = (await req.json()) as AsoAuditWorkflowResumeParams
  return handleAsoAuditWorkflowResume(req, params)
}
