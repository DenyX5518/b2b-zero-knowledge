FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/crypto-client/package.json packages/crypto-client/package.json
RUN npm ci --workspace @kontur/api --include-workspace-root
COPY apps/api apps/api
RUN npm run build --workspace @kontur/api

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
USER node
CMD ["node", "apps/api/dist/main.js"]
