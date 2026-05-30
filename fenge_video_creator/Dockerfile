FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY api ./api
COPY config ./config
COPY providers ./providers
COPY services ./services
COPY storage ./storage
COPY web ./web

ENV NODE_ENV=production
ENV PORT=3030

EXPOSE 3030

CMD ["node", "api/server.js"]
