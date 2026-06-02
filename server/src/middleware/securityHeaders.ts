import { type Request, type Response, type NextFunction } from "express";

export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // Content Security Policy
  // Note: In a real implementation, we would use nonces or hashes for inline scripts/styles
  // For now, we're removing unsafe-inline and unsafe-eval but this may break functionality
  // that relies on inline scripts/styles. A proper implementation would require identifying
  // and allowing specific inline content through nonces or hashes.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
  );

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy but still useful for older browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );

  // HSTS (HTTP Strict Transport Security) - only in production
  // Note: In development, we might not want to set this as it can cause issues
  // with local development and self-signed certificates
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  next();
}