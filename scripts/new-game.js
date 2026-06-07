#!/usr/bin/env node
/**
 * Scaffolds a new Phaser game app in the monorepo.
 *
 * Usage:
 *   node scripts/new-game.js <game-name> [port]
 *
 * Example:
 *   node scripts/new-game.js blackjack 8082
 *
 * Creates apps/<game-name>/ with all boilerplate ready to go.
 * Then run: pnpm install && pnpm --filter <game-name> dev
 */

const fs = require('fs');
const path = require('path');

const name = process.argv[2];
const port = process.argv[3] || '8082';

if (!name) {
  console.error('Usage: node scripts/new-game.js <game-name> [port]');
  process.exit(1);
}

const root = path.join(__dirname, '..', 'apps', name);

if (fs.existsSync(root)) {
  console.error(`Error: apps/${name}/ already exists`);
  process.exit(1);
}

function write(relPath, content) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart());
  console.log(`  created ${relPath}`);
}

console.log(`\nScaffolding apps/${name}/ (port ${port})...\n`);

// package.json
write('package.json', `
{
  "name": "${name}",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite --config vite/config.dev.mjs",
    "build": "vite build --config vite/config.prod.mjs"
  },
  "devDependencies": {
    "typescript": "~5.7.2",
    "vite": "^6.3.1"
  },
  "dependencies": {
    "@party/cards": "workspace:*",
    "phaser": "^3.90.0",
    "terser": "^5.39.0"
  }
}
`);

// tsconfig.json
write('tsconfig.json', `
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strictPropertyInitialization": false,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"]
}
`);

// index.html
write('index.html', `
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/style.css">
    <title>${name}</title>
</head>
<body>
    <div id="app">
        <div id="game-container"></div>
    </div>
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
`);

// public/style.css
write('public/style.css', `
html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background-color: #000000;
    overflow: hidden;
}

#app {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

#game-container {
    width: 100%;
    height: 100%;
}
`);

// vite/config.dev.mjs
write('vite/config.dev.mjs', `
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
        port: ${port}
    }
});
`);

// vite/config.prod.mjs
write('vite/config.prod.mjs', `
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
        port: ${port}
    },
    plugins: []
});
`);

// src/vite-env.d.ts
write('src/vite-env.d.ts', `
/// <reference types="vite/client" />
`);

// src/main.ts
write('src/main.ts', `
import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {
    StartGame('game-container');
});
`);

// src/game/main.ts
write('src/game/main.ts', `
import { AUTO, Game, Scale, Types } from 'phaser';
import { MainScene } from './scenes/MainScene';

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [MainScene],
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
`);

// src/game/scenes/MainScene.ts
write('src/game/scenes/MainScene.ts', `
import { Scene } from 'phaser';

export class MainScene extends Scene {
  constructor() {
    super('MainScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.text(W / 2, H / 2, '${name}', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5);
  }
}
`);

// public/assets placeholder
write('public/assets/.gitkeep', '');

console.log(`
Done! Next steps:
  1. pnpm install
  2. pnpm --filter ${name} dev
  3. Open http://localhost:${port}
`);
