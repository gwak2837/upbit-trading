# Install all packages and transpile TypeScript into JavaScript
FROM node:18-alpine AS builder

ENV NODE_ENV=production

WORKDIR /app

COPY .yarn .yarn
COPY src src
COPY .yarnrc.yml package.json tsconfig.json esbuild.js yarn.lock ./

RUN yarn
RUN yarn build

# Install only dependency packages
FROM node:18-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app/out out

EXPOSE $PORT

ENTRYPOINT ["node", "out/index.cjs"]
