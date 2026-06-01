import type { Metadata } from 'next'

import { ConversationWorkspace } from '@/components/conversation/workspace'

export const metadata: Metadata = {
  title: 'ASO Audit Agent',
  description: 'Conversational App Store optimization audits.',
}

export default function Home() {
  return <ConversationWorkspace />
}
