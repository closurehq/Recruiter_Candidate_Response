'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function AuthGuard() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login') return
    if (!localStorage.getItem('admin_secret')) {
      router.replace('/login')
    }
  }, [pathname, router])

  return null
}
