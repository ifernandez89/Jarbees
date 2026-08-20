# Deploying JarBees frontend (GitHub Pages + Cloudflare Tunnel guidance)

This guide shows two workable approaches to publish the frontend and expose the backend safely.

Option A — GitHub Pages (static export)

1) Notes and caveats
- Next.js App Router is not fully compatible with `next export`. Export works only for fully static pages. If you rely on server-only routes or dynamic server rendering, prefer Vercel/Netlify or a static build + client-side routing approach.

2) Steps (if your site is exportable)

```bash
# 1. Build and export static files
npm run build
npx next export -o out

# 2. Deploy `out/` to GitHub Pages (use an action or push to gh-pages branch)
```

3) Example GitHub Actions (push to `gh-pages` branch)

```yaml
name: Deploy to GitHub Pages (static export)
on:
  push:
    branches: [ main ]

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npx next export -o out
      - name: Deploy to Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

4) Environment variables
- For production use set `NEXT_PUBLIC_BACKEND_URL` to your public backend (Cloudflare Tunnel hostname) in your CI build environment (GitHub Actions secrets). Example: `NEXT_PUBLIC_BACKEND_URL=https://jarbees.midominio.com`.

Option B — Recommend Vercel / Netlify (recommended for full Next.js app)

- Deploying to Vercel or Netlify handles Next.js app router, image optimizations, and serverless functions. Use Git integration and set the `NEXT_PUBLIC_BACKEND_URL` and `NEXT_PUBLIC_API_TOKEN` in the project settings.

Expose backend securely (Cloudflare Tunnel)

1) Run `cloudflared` on your NestJS host to create a secure HTTPS hostname. See `docs/CLOUDFLARE_TUNNEL.md` in this repo.

2) Set `NEXT_PUBLIC_BACKEND_URL` to the Cloudflare Tunnel URL in your frontend deployment environment.

Simple server-side token validation (server `.env`)

```env
API_SECRET=changeme-very-secret
```

Middleware example (Node/NestJS pseudocode):

```ts
// express-like middleware
function validateToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).send('missing');
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || token !== process.env.API_SECRET) return res.status(403).send('forbidden');
  next();
}
```

CI secrets

- Store `NEXT_PUBLIC_API_TOKEN` and `NEXT_PUBLIC_BACKEND_URL` in repository secrets and reference them during build.

Final note

- If you want, I can add a GitHub Actions workflow file to this repo (disabled by default) that performs `next export` and deploys to `gh-pages`. Tell me if you want the workflow added.
