import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import AuthGuard from './AuthGuard'

const ibmPlexSans = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-sans',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
})

export const metadata: Metadata = {
  title: 'Closure',
  description: 'Send specific, evidenced rejection emails to interviewed candidates.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground font-sans antialiased">
        <AuthGuard />
        <nav className="border-b border-neutral-200 bg-white">
          <div className="max-w-5xl mx-auto px-6 h-10 flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
            >
              Closure
            </Link>
            <Link
              href="/settings"
              className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
            >
              Settings
            </Link>
          </div>
        </nav>
        <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
      </body>
    </html>
  )
}
