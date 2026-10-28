FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsup.bundle.config.ts ./
COPY src ./src
RUN npm run build:bundle

FROM node:22-slim
WORKDIR /app
COPY --from=build /app/bundle/server.js ./server.js
USER node
ENTRYPOINT ["node", "server.js"]
