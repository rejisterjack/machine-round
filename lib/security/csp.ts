export function buildCsp(nonce: string, isDev: boolean): string {
  const scriptSrc = isDev
    ? `'self' 'unsafe-eval' 'unsafe-inline' https://www.clarity.ms`
    : `'self' 'nonce-${nonce}' https://www.clarity.ms`;

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://res.cloudinary.com https://do6gp1uxl3luu.cloudfront.net",
    "font-src 'self' data:",
    "connect-src 'self' https://*.openai.azure.com wss://*.openai.azure.com https://res.cloudinary.com https://www.clarity.ms https://accounts.google.com",
    "media-src 'self' blob: https://res.cloudinary.com",
    "frame-src https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  return directives.join("; ");
}
