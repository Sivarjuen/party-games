import { AUTO, Game, Scale, Types } from 'phaser';
import { PlayerSelectScene } from './scenes/PlayerSelectScene';
import { UnoGameScene } from './scenes/UnoGameScene';

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#000000ff',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [PlayerSelectScene, UnoGameScene],
};

const StartGame = (parent: string): Game => {
  return new Game({ ...config, parent });
};

export default StartGame;
