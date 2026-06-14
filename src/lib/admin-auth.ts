export interface AdminTokenPayload {
  id: string
  email: string
  role: string
  full_name: string
  exp: number
}

export function parseAdminToken(token: string): AdminTokenPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as AdminTokenPayload
    if (Date.now() > payload.exp) return null
    if (payload.role !== 'admin') return null
    return payload
  } catch {
    return null
  }
}
