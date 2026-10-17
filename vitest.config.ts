import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['Web/shared/**/*.test.ts','Web/frontend/**/*.test.{ts,tsx}','Web/backend/agent/**/*.test.ts'],environment:'node',clearMocks:true,restoreMocks:true}});
