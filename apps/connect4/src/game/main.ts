import { AUTO, Game, Scale, Types } from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { COLS, ROWS, CELL_SIZE, BOARD_PADDING, BG_COLOR } from './constants';

const GAME_WIDTH = COLS * CELL_SIZE + BOARD_PADDING * 2;
const GAME_HEIGHT = (ROWS + 1) * CELL_SIZE + BOARD_PADDING * 2 + 80;

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: BG_COLOR,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
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
