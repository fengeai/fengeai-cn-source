FROM node:20-alpine

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3010

EXPOSE 3010
CMD ["node", "server.js"]
