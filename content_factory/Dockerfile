FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY . .

ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_API_BASE_URL="http://localhost:3100"

ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm --workspace @content-assistant/api run db:generate
RUN npm --workspace @content-assistant/api run build
RUN npm --workspace @content-assistant/web run build

EXPOSE 3002 3100
