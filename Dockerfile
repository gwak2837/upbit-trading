FROM node:18-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY out out

EXPOSE $PORT

ENTRYPOINT ["node", "out/index.cjs"]
