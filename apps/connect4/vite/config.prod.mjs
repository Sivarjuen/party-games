import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    envDir: './',
    logLevel: 'warning',
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: { passes: 2 },
            mangle: true,
            format: { comments: false }
        }
    },
    server: {
        port: 8083
    },
    plugins: []
});
