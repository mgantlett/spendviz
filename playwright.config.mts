import { defineConfig } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.mts',
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
});
