FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./package.json
COPY frontend/package.json ./frontend/package.json
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w frontend

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
