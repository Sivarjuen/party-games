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
        port: 8082,
        proxy: {
            '/api': {
                target: 'http://localhost:8788',
                changeOrigin: true,
            }
        }
    }
});
