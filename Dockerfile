# Local development image. Production runs as a Next standalone build on the
# host behind Caddy, not from this file — see the deploy workflow.
#
# node:24 — pnpm 11 needs Node >= 22.13, and 24 is the fleet default.
FROM node:24-alpine

WORKDIR /app

# corepack reads the packageManager pin from package.json
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3005

CMD ["pnpm", "run", "dev"]
