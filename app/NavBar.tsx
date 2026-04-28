'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function NavBar() {
  const pathname = usePathname()
  if (pathname === '/demo') return null

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 h-10 flex items-center justify-between">
        <Link
          href="/"
          className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
        >
          Closure
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/demo"
            className="text-[11px] font-medium tracking-widest uppercase text-accent hover:opacity-80 transition-opacity"
          >
            Try the demo
          </Link>
          <Link
            href="/settings"
            className="text-[11px] font-medium tracking-widest uppercase text-neutral-500 hover:text-foreground transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  )
}
