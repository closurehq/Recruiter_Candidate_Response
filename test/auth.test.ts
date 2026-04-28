import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'

const SECRET = 'test-secret-123'

beforeEach(() => {
  process.env.ADMIN_SECRET = SECRET
})

afterEach(() => {
  delete process.env.ADMIN_SECRET
})

describe('requireAdmin', () => {
  it('returns true when x-admin-secret matches ADMIN_SECRET', () => {
    const req = new NextRequest('http://localhost/api/roles', {
      headers: { 'x-admin-secret': SECRET },
    })
    expect(requireAdmin(req)).toBe(true)
  })

  it('returns false when x-admin-secret is wrong', () => {
    const req = new NextRequest('http://localhost/api/roles', {
      headers: { 'x-admin-secret': 'wrong' },
    })
    expect(requireAdmin(req)).toBe(false)
  })

  it('returns false when x-admin-secret header is absent', () => {
    const req = new NextRequest('http://localhost/api/roles')
    expect(requireAdmin(req)).toBe(false)
  })

  it('returns false when ADMIN_SECRET is not set', () => {
    delete process.env.ADMIN_SECRET
    const req = new NextRequest('http://localhost/api/roles', {
      headers: { 'x-admin-secret': SECRET },
    })
    expect(requireAdmin(req)).toBe(false)
  })
})
