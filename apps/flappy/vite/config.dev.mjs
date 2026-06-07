import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    envDir: './',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8082
    }
});
