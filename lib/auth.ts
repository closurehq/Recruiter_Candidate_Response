import { NextRequest } from 'next/server'

export function requireAdmin(req: NextRequest): boolean {
  const secret = req.headers.get('x-admin-secret')
  // TEMPORARY: remove after debugging ADMIN_SECRET mismatch
  console.log('[auth] header:', secret, 'env:', process.env.ADMIN_SECRET, 'match:', secret === process.env.ADMIN_SECRET)
  return secret === process.env.ADMIN_SECRET
}
