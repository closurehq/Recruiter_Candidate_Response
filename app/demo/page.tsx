import type { Metadata } from 'next'
import DemoClient from './DemoClient'

export const metadata: Metadata = {
  title: 'What your rejection email should have looked like — Closure',
  description:
    'Paste the job description, upload your CV, and see the specific, evidenced rejection email a recruiter with your documents could have sent.',
}

export default function DemoPage() {
  return <DemoClient />
}
