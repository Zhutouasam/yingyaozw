# Yingyao Media

Static website and Nginx deployment configuration for the Yingyao Media
off-site ecommerce promotion service.

## Structure

- `src/`: HTML, CSS, JavaScript, and image assets
- `nginx/default.conf`: HTTPS, security headers, caching, and static routing
- `docker-compose.yml`: Nginx container definition

## Deploy

Place the TLS certificate and private key at:

```text
ssl/yingyaozw.com.pem
ssl/yingyaozw.com.key
```

Then start the site:

```bash
docker compose up -d
```

The server publishes HTTP on port 80 and HTTPS on port 443. Runtime logs,
certificate material, and ACME challenge data are intentionally excluded from
Git.
