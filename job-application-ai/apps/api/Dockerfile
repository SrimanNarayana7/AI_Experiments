FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build --workspace=@repo/shared && npm run build --workspace=apps/api
# The API compiles to CommonJS while the workspace root declares "type": "module",
# so tag the dist directory as CommonJS to allow `node dist/index.js` to run.
RUN printf '{"type":"commonjs"}' > apps/api/dist/package.json
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package*.json ./
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
