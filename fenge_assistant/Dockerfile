FROM node:20-alpine

WORKDIR /app
COPY dist ./dist
COPY server.js ./server.js

EXPOSE 3020

CMD ["node", "server.js"]
