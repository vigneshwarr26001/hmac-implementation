import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        env: {
            NODE_ENV: 'test',
            PORT: '5000',
            AUTH_SIGNATURE: 'test-only-secret-do-not-use-in-production',
        },
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/server.ts', 'src/app.ts', 'src/config/env.ts', 'src/types/**'],
            reporter: ['text', 'html'],
        },
    },
});
