# Yingyao Media

Static website and Nginx deployment configuration for the Yingyao Media
off-site ecommerce promotion service.

## Structure

- `src/`: HTML, CSS, JavaScript, and image assets
- `nginx/default.conf`: HTTPS, static routing, and Noon subdomain proxying
- `docker-compose.yml`: Nginx, Noon Next.js, and PostgreSQL services

## Deploy

Place the TLS certificate and private key at:

```text
ssl/yingyaozw.com.pem
ssl/yingyaozw.com.key
```

The Noon source is kept in the separate `Zhutouasam/noon` repository. On the
current server it is expected at `/root/.codex/code_project/noon`; override that
path with `NOON_SOURCE_DIR=/path/to/noon` when running Compose elsewhere. Create
DNS records for `sport`, `toy`, `case`, `pet`, and `grocery` pointing to the
same server as `yingyaozw.com`. The wildcard certificate covers these hosts.

Create the shared Docker network once on a new server:

```bash
docker network create yingyao-static_yingyao-network
```

Put production-only values such as `ADMIN_TOKEN`, `STRIPE_SECRET_KEY`, and
`STRIPE_WEBHOOK_SECRET` in an ignored `.env` file beside `docker-compose.yml`.

Then start the site:

```bash
docker compose up -d
```

To rebuild the Noon storefront after pulling new code:

```bash
docker compose up -d --build app
docker compose up -d nginx
```

The server publishes HTTP on port 80 and HTTPS on port 443. Runtime logs,
certificate material, and ACME challenge data are intentionally excluded from
Git.


## Current production website (荧耀站外)

The apex domain `https://yingyaozw.com` now runs the Offsite Node application.
The `src/` directory above is the legacy static website, retained for reference.

- Git checkout: `/opt/yingyao-static`
- Live release link: `/opt/yingyao-offsite/current`
- Current release: `/opt/yingyao-offsite/releases/20261015-first`
- `offsite/dist/`: deployed frontend HTML, compiled JavaScript, CSS and assets
- `offsite/server/`: deployed Node backend source
- `offsite/public/`: pricing seed assets
- `offsite/package.json`: original release manifest
- `deploy/yingyao-offsite.service`: production systemd service configuration
- `nginx/`: current HTTPS and reverse proxy configuration
- `compose.admin1101.yaml`: network override for the separate admin application

This snapshot was synchronized from the running release on 2026-11-07.
The release archive and server contain compiled frontend assets only: the
original React/Vite frontend source, build scripts and lockfile are absent.
Consequently this snapshot can run the deployed website, but `npm run build`,
`npm run dev` and `npm run sync:pricing` require the original source project.
The backend and compiled frontend are preserved without attempting to recreate
that missing source.

Run the preserved release with Node.js 24 or newer (no npm install required):

```bash
cd offsite
HOST=127.0.0.1 PORT=4173 PRICING_DB_PATH=/path/to/private/pricing.sqlite npm start
```

Production pricing, inquiries, accounts and sessions live in
`/opt/yingyao-offsite/data/pricing.sqlite`; back up this directory separately.
The database, credentials, certificates and environment files are excluded
from Git. Restoring the full live content requires that private database.
This Git synchronization does not change the running release or restart services.
