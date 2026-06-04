import { AUTO, Game, Scale, Types } from 'phaser';
import { PlayerSelectScene } from './scenes/PlayerSelectScene';
import { UnoGameScene } from './scenes/UnoGameScene';

const dpr = window.devicePixelRatio || 1;

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  width: Math.round(window.innerWidth * dpr),
  height: Math.round(window.innerHeight * dpr),
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [PlayerSelectScene, UnoGameScene],
};

const StartGame = (parent: string): Game => {
  const game = new Game({ ...config, parent });

  // Resize internal resolution when window changes (debounced)
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;

    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      game.scale.setGameSize(Math.round(w * dpr), Math.round(h * dpr));
    }, 200);
  });

  return game;
};

export default StartGame;
