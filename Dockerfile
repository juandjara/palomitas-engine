FROM node:20-alpine

RUN apk add --no-cache libc6-compat ffmpeg

WORKDIR /app

COPY . .

RUN npm ci && \
    npm prune --production

EXPOSE 3000
EXPOSE 6881

CMD ["npm", "start"]
