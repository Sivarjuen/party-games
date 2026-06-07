import { AUTO, Game, Scale, Types } from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { BG_COLOR } from './constants';

const isLandscape = window.innerWidth > window.innerHeight;
const GAME_WIDTH = isLandscape ? 1920 : 1080;
const GAME_HEIGHT = isLandscape ? 1080 : 1920;

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: BG_COLOR,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    autoRound: true,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scene: [MenuScene, GameScene],
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
