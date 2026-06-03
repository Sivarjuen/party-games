import { AUTO, Game, Scale, Types } from 'phaser';
import { PlayerSelectScene } from './scenes/PlayerSelectScene';
import { UnoGameScene } from './scenes/UnoGameScene';

const dpr = window.devicePixelRatio || 1;

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  // Set initial size to physical pixels
  width: Math.round(window.innerWidth * dpr),
  height: Math.round(window.innerHeight * dpr),
  scale: {
    mode: Scale.NONE,  // We manage sizing manually
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [PlayerSelectScene, UnoGameScene],
};

const StartGame = (parent: string): Game => {
  const game = new Game({ ...config, parent });

  // Scale the canvas element to fit the viewport via CSS
  // while keeping the internal resolution at physical pixels
  const applySize = () => {
    const canvas = game.canvas;
    if (!canvas) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // Internal buffer at full device resolution
    game.scale.resize(Math.round(w * dpr), Math.round(h * dpr));
  };

  game.events.once('ready', applySize);
  window.addEventListener('resize', () => {
    applySize();
  });

  return game;
};

export default StartGame;
