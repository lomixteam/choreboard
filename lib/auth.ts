import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { SessionUser } from './types'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function createSession(user: SessionUser): Promise<string> {
  // SignJWT requires a plain object with index signature, spread to satisfy it
  return new SignJWT({ userId: user.userId, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const token = cookies().get('session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, secret)
    return {
      userId: payload.userId as string,
      role: payload.role as 'admin' | 'member',
      name: payload.name as string,
    }
  } catch {
    return null
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')
  return session
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession()
  if (session.role !== 'admin') throw new Error('Forbidden')
  return session
}
