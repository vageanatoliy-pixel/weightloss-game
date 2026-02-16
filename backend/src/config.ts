import dotenv from 'dotenv';

dotenv.config();

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const frontendUrls = (process.env.FRONTEND_URLS ?? '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret',
  frontendUrl,
  allowedOrigins: [frontendUrl, ...frontendUrls],
};
