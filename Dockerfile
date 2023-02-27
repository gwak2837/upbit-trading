# Install all packages and transpile TypeScript into JavaScript
FROM node:18 AS builder

ENV NODE_ENV=production

WORKDIR /app

COPY .yarn .yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn

COPY src src
COPY tsconfig.json esbuild.js ./
RUN yarn build

# Install only dependency packages
FROM node:18-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/out out

EXPOSE $PORT

ENTRYPOINT ["node", "out/index.cjs"]
