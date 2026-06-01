import { handleWorkflowResume, type WorkflowResumeParams } from '@/lib/workflow-resume'

export async function POST(req: Request) {
  const params = (await req.json()) as WorkflowResumeParams
  return handleWorkflowResume(req, params)
}
