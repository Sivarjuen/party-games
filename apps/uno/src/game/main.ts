import { AUTO, Game, Scale, Types } from 'phaser';
import { PlayerSelectScene } from './scenes/PlayerSelectScene';
import { UnoGameScene } from './scenes/UnoGameScene';

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [UnoGameScene, PlayerSelectScene],  // DEV: skip menu, load 6-player game directly
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
