# Cloudflare setup for the blog

One-time provisioning the blog backend needs. The app code reads everything
through bindings/env (`wrangler.toml` + dashboard), so once these exist the
Functions in `functions/` work without code changes.

## 1. D1 database

```bash
npx wrangler d1 create fei-blog
```

Copy the printed `database_id` into `wrangler.toml` (`[[d1_databases]]`).
Apply the schema:

```bash
# local (for `wrangler pages dev`)
npx wrangler d1 migrations apply fei-blog --local
# production
npx wrangler d1 migrations apply fei-blog --remote
```

## 2. R2 bucket

```bash
npx wrangler r2 bucket create fei-blog-media
```

Then, in the dashboard (R2 > the bucket > Settings):

- **Public access** — enable an `r2.dev` URL or attach a custom domain
  (e.g. `media.fei.io`). Put that origin in `R2_PUBLIC_BASE` (`wrangler.toml`).
- **CORS** — allow `PUT` from the site origin so browser presigned uploads work.
  The config lives at `cloudflare/r2-cors.json`; apply it with:

  ```bash
  npx wrangler r2 bucket cors set fei-blog-media --file cloudflare/r2-cors.json
  ```

- **S3 API token** — create an R2 API token (Account > R2 > Manage API tokens)
  with object read/write on this bucket. Save the Access Key ID and Secret.

## 3. Cloudflare Access (Zero Trust)

Protect the admin UI and write API. In Zero Trust > Access > Applications, add a
**self-hosted** application covering these paths on the site domain:

- `/writing/admin*`
- `/api/admin/*`

Add a policy that allows your email (one-time PIN or Google). Copy the
application **AUD tag** into `POLICY_AUD`, and set `TEAM_DOMAIN` to
`https://<your-team>.cloudflareaccess.com`.

> Attach the policy to the application that already covers the hostname; do not
> create a second app scoped only to one hostname — Cloudflare has observed that
> blocking legitimate requests.

## 4. Secrets and vars

Non-secret vars live in `wrangler.toml` `[vars]` (or the dashboard):
`TEAM_DOMAIN`, `POLICY_AUD`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_BASE`.

Secrets go in the Pages dashboard (Settings > Variables and Secrets) or via CLI:

```bash
npx wrangler pages secret put R2_ACCESS_KEY_ID
npx wrangler pages secret put R2_SECRET_ACCESS_KEY
```

For local dev, copy `.dev.vars.example` to `.dev.vars` and fill it in.

## 5. Local development

```bash
npm run build            # produce dist/
npx wrangler pages dev    # serves dist/ + functions/ with D1 + R2 bindings
```

`wrangler pages dev` reads `.dev.vars`. Access is **not** enforced locally, so
`DEV_AUTH_BYPASS=true` lets the admin API run without a JWT. Pure-UI work can
still use `npm run dev` (Vite, port 9921), but `/api/*` only exists under
`wrangler pages dev`.
