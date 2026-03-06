// backend/prisma.config.ts
import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: 'file:./dev.db', // The URL belongs here in Prisma 7
  },
});