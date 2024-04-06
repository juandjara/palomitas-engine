FROM node:20-alpine

RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

COPY . .

RUN npm ci && \
    npm prune --production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

USER hono
EXPOSE 3000
EXPOSE 6881

CMD ["npm", "start"]
