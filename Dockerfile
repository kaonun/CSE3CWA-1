# Install dependencies, build the application, then copy only its runtime files.
ARG NODE_IMAGE=node:24-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20

FROM ${NODE_IMAGE} AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Optional build-only trust for networks using a locally trusted TLS-scanning CA.
RUN --mount=type=secret,id=npm_ca \
    if [ -f /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --no-audit --no-fund

FROM dependencies AS builder
COPY . .
RUN npm run lint && mkdir -p public && npm run build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# Database bootstrap uses the same ORM/driver and tracked migrations as the app.
COPY --from=builder --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=node:node /app/src/lib/db ./src/lib/db
COPY --from=builder --chown=node:node /app/src/lib/phonemes ./src/lib/phonemes
COPY --from=builder --chown=node:node /app/src/data/phonemes.js ./src/data/phonemes.js
COPY --from=builder --chown=node:node /app/drizzle ./drizzle
COPY --from=builder --chown=node:node /app/scripts/migrate-database.mjs /app/scripts/start-container.mjs ./scripts/
RUN mkdir -p /app/data && chown node:node /app/data
ENV DATABASE_PATH=/app/data/phonemele.db
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health/database',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/start-container.mjs"]
