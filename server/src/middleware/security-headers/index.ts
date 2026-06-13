import { RequestHandler } from "express";

/**
 * Security headers middleware to protect against common web vulnerabilities.
 * Adds essential security headers to all responses.
 */
export function securityHeaders(): RequestHandler {
  return (_req, res, next) => {
    // Prevent browsers from MIME-sniffing a response away from declared content-type
    res.setHeader("X-Content-Type-Options", "nosniff");
    
    // Protect against clickjacking by denying framing
    res.setHeader("X-Frame-Options", "DENY");
    
    // Enable XSS protection in browsers (legacy but still useful)
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    // Control how much referrer information is included in requests
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Prevent Internet Explorer from downloading files when they're set to execute
    res.setHeader("X-Download-Options", "noopen");
    
    // Prevent Internet Explorer from executing downloads in your site's context
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    
    // Hide powered-by header to reduce information disclosure
    res.removeHeader("X-Powered-By");
    
    next();
  };
}