FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

COPY package*json tsconfig.json src ./

RUN npm ci && \
    npm prune --production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

USER hono
EXPOSE 3000

CMD ["npm", "start"]
