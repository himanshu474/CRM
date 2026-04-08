// src/config/mailpit.ts — NEW
/**
 * Mailpit local email catcher.
 *
 * Run via Docker: docker compose up -d mailpit
 * Web UI:        http://localhost:8025
 *
 * No config needed in email.ts — just set these in .env for development:
 *   SMTP_HOST=localhost
 *   SMTP_PORT=1025
 *   SMTP_USER=   (leave empty)
 *   SMTP_PASS=   (leave empty)
 *
 * Your existing email.ts transporter works with Mailpit automatically
 * because it reads SMTP_HOST and SMTP_PORT from env vars.
 * This file is documentation only — no code changes needed.
 */

export const MAILPIT_CONFIG = {
  host: "localhost",
  port: 1025,
  webUI: "http://localhost:8025",
} as const;