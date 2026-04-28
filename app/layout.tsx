import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import AuthGuard from './AuthGuard'
import NavBar from './NavBar'

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
        <NavBar />
        <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
      </body>
    </html>
  )
}
