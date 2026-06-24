// Bindings and vars available to every Pages Function.
// Configured in wrangler.toml and the Pages dashboard — see docs/cloudflare-setup.md.
export interface Env {
  // Bindings
  DB: D1Database;
  MEDIA: R2Bucket;

  // Cloudflare Access
  TEAM_DOMAIN: string;
  POLICY_AUD: string;

  // R2 presigning + public reads
  R2_ACCOUNT_ID: string;
  R2_BUCKET: string;
  R2_PUBLIC_BASE: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;

  // Local dev only: when "true", the admin middleware skips JWT verification
  // because Cloudflare Access does not run under `wrangler pages dev`.
  DEV_AUTH_BYPASS?: string;
}
