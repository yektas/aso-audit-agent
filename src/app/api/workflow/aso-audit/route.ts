import { handleWorkflowResume, type WorkflowResumeParams } from '@/lib/workflow-resume'
import { workflowResumeParamsSchema } from '@/lib/workflow-resume'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const parsedParams = workflowResumeParamsSchema.safeParse(await req.json())
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'The workflow resume request body was invalid.' }, { status: 400 })
  }

  const params: WorkflowResumeParams = parsedParams.data
  return handleWorkflowResume(req, params)
}
