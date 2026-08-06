FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
# SvelteKit evaluates server module imports while compiling. The postgres client
# is lazy, so a non-routable build-only URL is sufficient and no connection is made.
RUN DATABASE_URL=postgres://build:build@127.0.0.1:5432/build bun run build

FROM oven/bun:1.3.14
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bun.lock ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib/server/db ./src/lib/server/db
COPY --from=build /app/src/lib/server/secret-crypto.ts ./src/lib/server/secret-crypto.ts
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
EXPOSE 3000
CMD ["sh", "-c", "bun run db:push:container && bun ./build"]
