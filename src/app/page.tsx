import type { Metadata } from 'next'

import { AuditChatWorkspace } from '@/components/aso-audit/audit-chat-workspace'

export const metadata: Metadata = {
  title: 'ASO Audit Agent',
  description: 'Conversational App Store optimization audits.',
}

export default function Home() {
  return <AuditChatWorkspace />
}
