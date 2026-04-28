import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import AuthGuard from './AuthGuard'

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Closure',
  description: 'Send specific, evidenced rejection emails to interviewed candidates.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans antialiased">
        <AuthGuard />
        <div className="max-w-4xl mx-auto px-6 py-8">{children}</div>
      </body>
    </html>
  )
}
