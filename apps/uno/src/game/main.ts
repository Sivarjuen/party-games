import { AUTO, Game, Scale, Types } from 'phaser';
import { PlayerSelectScene } from './scenes/PlayerSelectScene';
import { UnoGameScene } from './scenes/UnoGameScene';

const config: Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#1a472a',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [PlayerSelectScene, UnoGameScene],
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
