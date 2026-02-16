FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./package.json
COPY backend/package.json ./backend/package.json
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate -w backend && npm run build -w backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/package.json ./backend/package.json
COPY --from=builder /app/backend/entrypoint.sh ./backend/entrypoint.sh
COPY --from=builder /app/prisma ./prisma
WORKDIR /app/backend
EXPOSE 4000
CMD ["sh", "./entrypoint.sh"]
