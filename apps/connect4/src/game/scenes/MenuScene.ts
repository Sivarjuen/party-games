import { Scene } from 'phaser';
import { BG_COLOR } from '../constants';

export class MenuScene extends Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Title
    this.add.text(W / 2, H * 0.14, 'CONNECT 4', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // Byline
    this.add.text(W / 2, H * 0.20, 'By: Siv', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    const btnW = 220;
    const btnH = 56;

    // VS Online button (grayed out)
    const onlineBtnY = H * 0.38;

    const onlineBtn = this.add.graphics();
    onlineBtn.fillStyle(0x444444, 1);
    onlineBtn.fillRoundedRect(W / 2 - btnW / 2, onlineBtnY - btnH / 2, btnW, btnH, 10);

    this.add.text(W / 2, onlineBtnY, 'VS Online', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '28px',
      color: '#888888',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    this.add.text(W / 2, onlineBtnY + btnH / 2 + 14, 'coming soon', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '14px',
      color: '#666666',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // VS Local button
    const localBtnY = H * 0.55;

    const localBtn = this.add.graphics();
    localBtn.fillStyle(0x2266cc, 1);
    localBtn.fillRoundedRect(W / 2 - btnW / 2, localBtnY - btnH / 2, btnW, btnH, 10);

    this.add.text(W / 2, localBtnY, 'VS Local', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    const localZone = this.add.zone(W / 2, localBtnY, btnW, btnH).setInteractive({ useHandCursor: true });
    localZone.on('pointerup', () => {
      this.scene.start('GameScene', { mode: 'local' });
    });

    // VS AI button
    const aiBtnY = H * 0.7;

    const aiBtn = this.add.graphics();
    aiBtn.fillStyle(0x2266cc, 1);
    aiBtn.fillRoundedRect(W / 2 - btnW / 2, aiBtnY - btnH / 2, btnW, btnH, 10);

    this.add.text(W / 2, aiBtnY, 'VS AI', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    const aiZone = this.add.zone(W / 2, aiBtnY, btnW, btnH).setInteractive({ useHandCursor: true });
    aiZone.on('pointerup', () => {
      this.scene.start('GameScene', { mode: 'ai' });
    });
  }
}
