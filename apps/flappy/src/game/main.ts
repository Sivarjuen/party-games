import { AUTO, Game, Scale, Types } from 'phaser';
import { GameScene } from './scenes/GameScene';

// Fixed width, dynamic height to fill tall mobile screens
const GAME_WIDTH = 420;
const MIN_HEIGHT = 720;
const MAX_HEIGHT = 960;

function getGameHeight(): number {
  const aspectRatio = window.innerHeight / window.innerWidth;
  const calculatedHeight = Math.round(GAME_WIDTH * aspectRatio);
  return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, calculatedHeight));
}

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#70c5ce',
  width: GAME_WIDTH,
  height: getGameHeight(),
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scene: [GameScene],
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
