const VISITOR_COOKIE_NAME = 'aso_audit_visitor'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const VISITOR_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type VisitorSession = {
  resourceId: string
  setCookieHeader: string | null
}

function parseCookieValue(request: Request) {
  const cookieHeader = request.headers.get('cookie')
  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const [name, ...valueParts] = part.trim().split('=')
    if (name === VISITOR_COOKIE_NAME) {
      return decodeURIComponent(valueParts.join('='))
    }
  }

  return null
}

function serializeVisitorCookie(visitorId: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${VISITOR_COOKIE_NAME}=${encodeURIComponent(visitorId)}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`
}

export function getVisitorSession(request: Request): VisitorSession {
  const existingVisitorId = parseCookieValue(request)
  const visitorId =
    existingVisitorId && VISITOR_ID_PATTERN.test(existingVisitorId) ? existingVisitorId : crypto.randomUUID()

  return {
    resourceId: `anonymous-visitor:${visitorId}`,
    setCookieHeader: existingVisitorId === visitorId ? null : serializeVisitorCookie(visitorId),
  }
}

export function appendVisitorCookie<T extends Response>(response: T, session: VisitorSession) {
  if (session.setCookieHeader) {
    response.headers.append('Set-Cookie', session.setCookieHeader)
  }

  return response
}
