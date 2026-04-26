import { LobbyScene } from "./scenes/LobbyScene";
import { MainScene } from "./scenes/MainScene";
import { AUTO, Game, Scale, Types } from "phaser";

const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: "game-container",
  backgroundColor: "#180e23",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [LobbyScene, MainScene],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
