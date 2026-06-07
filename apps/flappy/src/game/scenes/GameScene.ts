import { Scene, GameObjects } from 'phaser';
import { Bird } from '../entities/Bird';
import { PipeSpawner } from '../systems/PipeSpawner';
import { CollisionSystem } from '../systems/CollisionSystem';
import { ScoreSystem } from '../systems/ScoreSystem';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { ScoreText } from '../ui/ScoreText';
import { GameOverOverlay } from '../ui/GameOverOverlay';
import { getMedalForScore } from '../ui/Medal';
import {
  BIRD_START_X_RATIO,
  BIRD_START_Y_RATIO,
  GROUND_HEIGHT,
  COLOR_SKY,
  COLOR_GROUND,
  DEBUG_INVINCIBLE,
} from '../constants';

enum GameState {
  READY,
  PLAYING,
  PAUSED,
  GAME_OVER,
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}



export class GameScene extends Scene {
  private bird!: Bird;
  private pipeSpawner!: PipeSpawner;
  private collisionSystem!: CollisionSystem;
  private scoreSystem!: ScoreSystem;
  private scoreText!: ScoreText;
  private gameOverOverlay: GameOverOverlay | null = null;
  private state: GameState = GameState.READY;
  private groundGraphics!: GameObjects.Graphics;
  private groundTop!: number;
  private readyText!: GameObjects.Text;
  private highScoreDisplay!: GameObjects.Text;
  private titleText!: GameObjects.Text;
  private bylineText!: GameObjects.Text;
  private groundScrollX: number = 0;
  private nightOverlay!: GameObjects.Graphics;
  private pauseButton!: GameObjects.Text;
  private pauseOverlay!: GameObjects.Container;
  private pauseTapped: boolean = false;
  private parallax!: ParallaxBackground;

  // Day/night cycle config (in raw score values)
  // Score 15-30: darken, 30-40: full night, 40-55: brighten, 55-65: full day, repeats every 50
  private readonly CYCLE_SCORE_START = 15;
  private readonly CYCLE_LENGTH = 50; // score per full cycle
  private readonly NIGHT_COLOR = 0x0a0a2e;
  private currentDarkness: number = 0;
  private targetDarkness: number = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.groundTop = H - GROUND_HEIGHT;

    // Sky background
    this.cameras.main.setBackgroundColor(COLOR_SKY);

    // Ground
    this.groundGraphics = this.add.graphics();
    this.drawGround();

    // Systems
    this.pipeSpawner = new PipeSpawner(this, this.groundTop);
    this.collisionSystem = new CollisionSystem(this.groundTop);
    this.scoreSystem = new ScoreSystem();

    // Bird
    const birdX = W * BIRD_START_X_RATIO;
    const birdY = H * BIRD_START_Y_RATIO;
    this.bird = new Bird(this, birdX, birdY, this.groundTop);

    // Night overlay (drawn on top of sky/pipes but below UI)
    this.nightOverlay = this.add.graphics();
    this.nightOverlay.setDepth(8);

    // Parallax background layers (horizon, stars, clouds, hills)
    this.parallax = new ParallaxBackground(this);

    this.updateDayNightCycle();

    // UI
    this.scoreText = new ScoreText(this);
    this.scoreText.setVisible(false);

    // Title
    this.titleText = this.add.text(W / 2, H * 0.14, 'FLAPPY', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '64px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Byline
    this.bylineText = this.add.text(W / 2, H * 0.20, 'By: Siv', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // High score + medal on ready screen
    this.highScoreDisplay = this.add.text(W / 2, H * 0.65, '', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);
    this.updateHighScoreDisplay();

    // Ready text
    this.readyText = this.add.text(W / 2, H * 0.40, 'Tap to start', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);

    this.tweens.add({
      targets: this.readyText,
      alpha: 0.4,
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // Pause button (top-right, visible only during gameplay)
    const pauseSize = 40;
    this.pauseButton = this.add.text(W - pauseSize / 2 - 10, pauseSize / 2 + 10, '⏸', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(15).setAlpha(0.5).setVisible(false);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => {
      this.pauseTapped = true;
      this.pauseGame();
    });

    // Pause overlay (hidden by default)
    this.pauseOverlay = this.add.container(0, 0);
    this.pauseOverlay.setDepth(20).setVisible(false);
    const pauseBg = this.add.graphics();
    pauseBg.fillStyle(0x000000, 0.5);
    pauseBg.fillRect(0, 0, W, H);
    const pausedText = this.add.text(W / 2, H * 0.35, 'PAUSED', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // Large resume button
    const btnW = 180;
    const btnH = 60;
    const btnX = W / 2;
    const btnY = H * 0.48;
    const resumeBtn = this.add.graphics();
    resumeBtn.fillStyle(0x44aa44, 1);
    resumeBtn.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    resumeBtn.lineStyle(3, 0x228822);
    resumeBtn.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    const resumeBtnText = this.add.text(btnX, btnY, '▶  RESUME', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // Make the button interactive via a zone
    const resumeZone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    resumeZone.on('pointerdown', () => {
      this.pauseTapped = true;
      this.resumeGame();
    });

    this.pauseOverlay.add([pauseBg, pausedText, resumeBtn, resumeBtnText, resumeZone]);

    // Input
    this.input.on('pointerdown', this.handleInput, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleInput, this);

    this.state = GameState.READY;
  }

  update(_time: number, delta: number): void {
    if (this.state === GameState.READY) {
      // Gentle bob animation for bird
      this.bird.y += Math.sin(_time * 0.004) * 0.5;
      this.bird.update(0); // redraw without physics
      this.scrollGround(delta);
      this.parallax.update(delta, this.currentDarkness);
      return;
    }

    if (this.state === GameState.PLAYING) {
      this.bird.update(delta);
      this.pipeSpawner.update(delta);
      this.scrollGround(delta);
      this.applyDayNightVisuals(delta);

      // Score check
      if (this.scoreSystem.check(this.bird, this.pipeSpawner.getPipes())) {
        this.scoreText.setScore(this.scoreSystem.score);
        this.pipeSpawner.setScore(this.scoreSystem.score);
        this.updateDayNightCycle();
      }

      // Collision check
      if (!DEBUG_INVINCIBLE && this.collisionSystem.check(this.bird, this.pipeSpawner.getPipes())) {
        this.onGameOver();
      }
    }

    if (this.state === GameState.GAME_OVER) {
      // Animate bird falling to ground and rolling to a stop
      const settled = this.bird.updateDead(delta);
      if (settled && !this.gameOverOverlay) {
        this.showGameOverOverlay();
      }
    }
  }

  private handleInput(): void {
    // Skip if pause button was just tapped
    if (this.pauseTapped) {
      this.pauseTapped = false;
      return;
    }

    switch (this.state) {
      case GameState.READY:
        this.startPlaying();
        break;
      case GameState.PLAYING:
        this.bird.flap();
        break;
      case GameState.PAUSED:
        // Only the resume button resumes, ignore other taps
        break;
      case GameState.GAME_OVER:
        if (this.bird.landed && this.bird.velocityY === 0 && this.gameOverOverlay) {
          this.restart();
        }
        break;
    }
  }

  private pauseGame(): void {
    if (this.state !== GameState.PLAYING) return;
    this.state = GameState.PAUSED;
    this.pauseOverlay.setVisible(true);
    this.pauseButton.setVisible(false);
  }

  private resumeGame(): void {
    this.state = GameState.PLAYING;
    this.pauseOverlay.setVisible(false);
    this.pauseButton.setVisible(true);
  }

  private startPlaying(): void {
    this.state = GameState.PLAYING;
    this.readyText.setVisible(false);
    this.highScoreDisplay.setVisible(false);
    this.titleText.setVisible(false);
    this.bylineText.setVisible(false);
    this.pauseButton.setVisible(true);
    this.scoreText.setVisible(true);
    this.scoreText.setScore(0);
    this.bird.flap();
    this.pipeSpawner.start();
  }

  private onGameOver(): void {
    this.state = GameState.GAME_OVER;
    this.bird.die();
    this.pipeSpawner.stop();
    this.scoreSystem.finalize();
    this.pauseButton.setVisible(false);

    // Screen flash
    this.cameras.main.flash(200, 255, 255, 255);
    this.cameras.main.shake(200, 0.01);
  }

  private showGameOverOverlay(): void {
    this.gameOverOverlay = new GameOverOverlay(
      this,
      this.scoreSystem.score,
      this.scoreSystem.highScore
    );
  }

  private updateHighScoreDisplay(): void {
    const hs = this.scoreSystem.highScore;
    if (hs === 0) {
      this.highScoreDisplay.setText('');
      return;
    }
    const medal = getMedalForScore(hs);
    const medalStr = medal ? `${medal.name} ` : '';
    this.highScoreDisplay.setText(`Highscore: ${hs}${medalStr}`);
  }

  private restart(): void {
    // Clean up
    if (this.gameOverOverlay) {
      this.gameOverOverlay.destroy();
      this.gameOverOverlay = null;
    }
    this.pipeSpawner.reset();
    this.scoreSystem.reset();
    this.scoreText.setScore(0);

    const W = this.scale.width;
    const H = this.scale.height;
    this.bird.reset(W * BIRD_START_X_RATIO, H * BIRD_START_Y_RATIO);

    this.state = GameState.READY;
    this.readyText.setVisible(true);
    this.highScoreDisplay.setVisible(true);
    this.titleText.setVisible(true);
    this.bylineText.setVisible(true);
    this.updateHighScoreDisplay();
    this.scoreText.setVisible(false);
    this.targetDarkness = 0;
    this.currentDarkness = 0;
    this.updateDayNightCycle();
    this.parallax.update(16, 0);
    this.applyDayNightVisuals(16);
  }

  private scrollGround(delta: number): void {
    this.groundScrollX -= (280 * delta) / 1000; // match pipe speed roughly
    if (this.groundScrollX <= -40) {
      this.groundScrollX += 40;
    }
    this.drawGround();
  }

  private updateDayNightCycle(): void {
    const score = this.scoreSystem.score;

    if (score < this.CYCLE_SCORE_START) {
      this.targetDarkness = 0;
    } else {
      const pos = (score - this.CYCLE_SCORE_START) % this.CYCLE_LENGTH;

      if (pos < 15) {
        this.targetDarkness = pos / 15;
      } else if (pos < 25) {
        this.targetDarkness = 1;
      } else if (pos < 40) {
        this.targetDarkness = 1 - (pos - 25) / 15;
      } else {
        this.targetDarkness = 0;
      }
    }
  }

  private applyDayNightVisuals(delta: number): void {
    // Smoothly interpolate toward target
    const speed = 2; // per second — lower = slower transition
    const dt = delta / 1000;
    const diff = this.targetDarkness - this.currentDarkness;
    this.currentDarkness += diff * Math.min(1, speed * dt);

    // Snap if close enough
    if (Math.abs(diff) < 0.001) {
      this.currentDarkness = this.targetDarkness;
    }

    const darkness = this.currentDarkness;

    // Lerp the sky color toward night color
    const skyColor = lerpColor(COLOR_SKY, this.NIGHT_COLOR, darkness);
    this.cameras.main.setBackgroundColor(skyColor);

    // Overlay for extra darkening effect
    const maxAlpha = 0.55;
    const alpha = darkness * maxAlpha;

    const W = this.scale.width;
    const H = this.scale.height;
    this.nightOverlay.clear();
    if (alpha > 0) {
      this.nightOverlay.fillStyle(this.NIGHT_COLOR, alpha);
      this.nightOverlay.fillRect(0, 0, W, H);
    }

    // Parallax backgrounds (horizon, stars, clouds, hills)
    this.parallax.update(delta, darkness);
  }

  private drawGround(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.groundGraphics.clear();
    this.groundGraphics.setDepth(5);

    // Main ground fill
    this.groundGraphics.fillStyle(COLOR_GROUND);
    this.groundGraphics.fillRect(0, this.groundTop, W, GROUND_HEIGHT);

    // Top grass strip
    this.groundGraphics.fillStyle(0x5ebd3e);
    this.groundGraphics.fillRect(0, this.groundTop, W, 8);

    // Ground scroll lines
    this.groundGraphics.lineStyle(2, 0x6d4c2a, 0.4);
    const lineSpacing = 40;
    for (let x = this.groundScrollX; x < W + lineSpacing; x += lineSpacing) {
      this.groundGraphics.lineBetween(x, this.groundTop + 20, x - 10, H);
    }
  }
}
