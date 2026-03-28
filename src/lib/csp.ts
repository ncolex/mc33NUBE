export function buildMissionControlCsp(input: { nonce: string; googleEnabled: boolean }): string {
  const { nonce, googleEnabled } = input

  // For production builds, we need more permissive CSP
  // This is detected by checking if we're in a production environment
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (isProduction) {
    return [
      `default-src 'self'`,
      `base-uri 'self'`,
      `object-src 'none'`,
      `frame-ancestors 'none'`,
      // Allow inline scripts and styles for production builds (Next.js static optimization)
      `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' blob: https://cdn.jsdelivr.net`,
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      `connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://cdn.jsdelivr.net https://*.vercel.app https://*.neon.tech`,
      `img-src 'self' data: blob: https:`,
      `font-src 'self' data:`,
      `frame-src 'self'${googleEnabled ? ' https://accounts.google.com' : ''}`,
      `worker-src 'self' blob:`,
    ].join('; ')
  }

  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' blob:${googleEnabled ? ' https://accounts.google.com' : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    `connect-src 'self' ws: wss: http://127.0.0.1:* http://localhost:* https://cdn.jsdelivr.net`,
    `img-src 'self' data: blob:${googleEnabled ? ' https://*.googleusercontent.com https://lh3.googleusercontent.com' : ''}`,
    `font-src 'self' data:`,
    `frame-src 'self'${googleEnabled ? ' https://accounts.google.com' : ''}`,
    `worker-src 'self' blob:`,
  ].join('; ')
}

export function buildNonceRequestHeaders(input: {
  headers: Headers
  nonce: string
  googleEnabled: boolean
}): Headers {
  const requestHeaders = new Headers(input.headers)
  const csp = buildMissionControlCsp({ nonce: input.nonce, googleEnabled: input.googleEnabled })

  requestHeaders.set('x-nonce', input.nonce)
  requestHeaders.set('Content-Security-Policy', csp)

  return requestHeaders
}
