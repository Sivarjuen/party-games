import { GameObjects, Scene } from 'phaser';
import { GROUND_HEIGHT } from '../constants';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkle: boolean;
  twinkleSpeed: number;
  twinkleOffset: number;
  twinkleStart: number;
  twinkleEnd: number;
}

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Building {
  x: number;
  width: number;
  height: number;
  windows: { row: number; col: number; seed: number }[];
}

interface Town {
  x: number;
  width: number;
  buildings: Building[];
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface Flock {
  x: number;
  y: number;
  speed: number;
  direction: number; // 1 = right, -1 = left
  birdCount: number;
  spacing: number;
  flapOffset: number;
}

export class ParallaxBackground {
  private horizonGraphics: GameObjects.Graphics;
  private starsGraphics: GameObjects.Graphics;
  private cloudsGraphics: GameObjects.Graphics;
  private townGraphics: GameObjects.Graphics;

  private W: number;
  private H: number;
  private groundTop: number;

  // Stars
  private stars: Star[] = [];
  private maxStars = 80;
  private starsScrollX: number = 0;
  private elapsedTime: number = 0;
  private starsActiveTime: number = 0;
  private lastDt: number = 0;

  // Clouds
  private clouds: Cloud[] = [];
  private cloudsScrollX: number = 0;

  // Far hills (big, slow)
  private farHillsTileSprite!: GameObjects.TileSprite;
  private farHillsScrollX: number = 0;

  // Towns (between far hills and near hills)
  private towns: Town[] = [];
  private townScrollX: number = 0;
  private townWrapWidth: number = 0;

  // Near hills (small, fast, in front of towns)
  private nearHillsTileSprite!: GameObjects.TileSprite;
  private nearHillsScrollX: number = 0;

  // Sky objects
  private skyGraphics!: GameObjects.Graphics;
  private moonX: number = 0;
  private moonY: number = 0;
  private moonVx: number = -6; // slow drift right to left
  private moonVy: number = -1.5; // slight upward angle
  private shootingStars: ShootingStar[] = [];
  private shootingStarTimer: number = 0;
  private flocks: Flock[] = [];
  private flockTimer: number = 0;

  constructor(scene: Scene) {
    this.W = scene.scale.width;
    this.H = scene.scale.height;
    this.groundTop = this.H - GROUND_HEIGHT;

    // Horizon: depth -1 (behind everything)
    this.horizonGraphics = scene.add.graphics();
    this.horizonGraphics.setDepth(-1);

    // Stars: depth 0
    this.starsGraphics = scene.add.graphics();
    this.starsGraphics.setDepth(0);

    // Clouds: depth 1
    this.cloudsGraphics = scene.add.graphics();
    this.cloudsGraphics.setDepth(1);

    // Town graphics: depth 2.5 (between far hills and near hills)
    this.townGraphics = scene.add.graphics();
    this.townGraphics.setDepth(2.5);

    // Sky objects (moon, shooting stars, flocks, planes): depth 0.5
    this.skyGraphics = scene.add.graphics();
    this.skyGraphics.setDepth(0.5);

    this.generateStars();
    this.generateClouds();
    this.generateFarHills(scene);
    this.generateTowns();
    this.generateNearHills(scene);
    this.initMoon();
  }

  update(delta: number, darkness: number): void {
    const dt = delta / 1000;
    this.elapsedTime += dt;
    this.lastDt = dt;

    // Scroll speeds (parallax: further = slower)
    this.starsScrollX += 5 * dt;
    this.cloudsScrollX += 30 * dt;
    this.farHillsScrollX += 60 * dt;
    this.townScrollX += 90 * dt;
    this.nearHillsScrollX += 120 * dt;

    this.drawHorizon(darkness);
    this.drawStars(darkness);
    this.drawClouds(darkness);
    this.drawSkyObjects(dt, darkness);
    this.scrollFarHills();
    this.drawTowns(darkness);
    this.scrollNearHills();
  }

  reset(): void {
    this.starsScrollX = 0;
    this.cloudsScrollX = 0;
    this.farHillsScrollX = 0;
    this.townScrollX = 0;
    this.nearHillsScrollX = 0;
    this.horizonGraphics.clear();
    this.starsGraphics.clear();
    this.cloudsGraphics.clear();
    this.townGraphics.clear();
    this.skyGraphics.clear();
    this.farHillsTileSprite.tilePositionX = 0;
    this.nearHillsTileSprite.tilePositionX = 0;
    this.shootingStars = [];
    this.flocks = [];
    this.initMoon();
  }

  // --- Horizon ---

  private drawHorizon(darkness: number): void {
    this.horizonGraphics.clear();

    let sunsetIntensity = 0;
    if (darkness >= 0.1 && darkness <= 0.6) {
      if (darkness < 0.3) {
        sunsetIntensity = (darkness - 0.1) / 0.2;
      } else {
        sunsetIntensity = 1 - (darkness - 0.3) / 0.3;
      }
    }
    if (sunsetIntensity <= 0.01) return;

    const gradientHeight = this.groundTop * 0.85;
    const gradientTop = this.groundTop - gradientHeight;
    const steps = 64;
    const stepH = gradientHeight / steps;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const alpha = t * t * t * sunsetIntensity * 0.7;
      this.horizonGraphics.fillStyle(0xf07030, alpha);
      this.horizonGraphics.fillRect(0, gradientTop + i * stepH, this.W, stepH + 1);
    }
  }

  // --- Stars ---

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < this.maxStars; i++) {
      const twinkle = Math.random() < 0.4;
      const twinkleStart = Math.random() * 30;
      const twinkleDuration = 3 + Math.random() * 6;
      this.stars.push({
        x: Math.random() * this.W * 3,
        y: Math.random() * this.groundTop * 0.7,
        size: 1 + Math.random() * 2,
        brightness: 0.4 + Math.random() * 0.6,
        twinkle,
        twinkleSpeed: 0.5 + Math.random() * 1,
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleStart,
        twinkleEnd: twinkleStart + twinkleDuration,
      });
    }
  }

  private drawStars(darkness: number): void {
    this.starsGraphics.clear();
    if (darkness < 0.3) {
      this.starsActiveTime = 0;
      return;
    }

    this.starsActiveTime += this.lastDt;
    const starVisibility = Math.min(1, (darkness - 0.3) / 0.7);

    for (let i = 0; i < this.maxStars; i++) {
      const star = this.stars[i];
      const starThreshold = i / this.maxStars;
      const starFade = Math.min(1, Math.max(0, (starVisibility - starThreshold) / 0.15));
      if (starFade <= 0) continue;

      const sx = ((star.x - this.starsScrollX) % (this.W * 3) + this.W * 3) % (this.W * 3);
      if (sx > this.W) continue;

      let alpha = star.brightness * starFade;

      if (star.twinkle) {
        const cycle = star.twinkleStart + (star.twinkleEnd - star.twinkleStart);
        const t = this.starsActiveTime % cycle;
        if (t >= star.twinkleStart && t <= star.twinkleEnd) {
          const tw = 0.5 + 0.5 * Math.sin(t * star.twinkleSpeed + star.twinkleOffset);
          alpha *= 0.3 + tw * 0.7;
        }
      }

      this.starsGraphics.fillStyle(0xffffff, alpha);
      this.starsGraphics.fillCircle(sx, star.y, star.size);
    }
  }

  // --- Clouds ---

  private generateClouds(): void {
    this.clouds = [];
    const count = 8;
    const spacing = this.W * 3 / count;
    for (let i = 0; i < count; i++) {
      this.clouds.push({
        x: i * spacing + Math.random() * spacing * 0.5,
        y: 40 + Math.random() * (this.groundTop * 0.35),
        width: 50 + Math.random() * 60,
        height: 20 + Math.random() * 15,
      });
    }
  }

  private drawClouds(darkness: number): void {
    this.cloudsGraphics.clear();
    const cloudAlpha = Math.max(0, 1 - darkness * 1.2) * 0.6;
    if (cloudAlpha <= 0.01) return;

    const wrapWidth = this.W * 3;
    for (const cloud of this.clouds) {
      const cx = ((cloud.x - this.cloudsScrollX) % wrapWidth + wrapWidth) % wrapWidth - cloud.width;
      if (cx > this.W + cloud.width * 2) continue;
      if (cx < -cloud.width * 2) continue;
      this.drawCloudShape(cx, cloud.y, cloud.width, cloud.height, cloudAlpha);
    }
  }

  private drawCloudShape(x: number, y: number, w: number, h: number, alpha: number): void {
    this.cloudsGraphics.fillStyle(0xffffff, alpha);
    this.fillEllipse(x, y, w * 0.5, h * 0.5);
    this.fillEllipse(x - w * 0.3, y + h * 0.1, w * 0.35, h * 0.4);
    this.fillEllipse(x + w * 0.3, y + h * 0.05, w * 0.4, h * 0.45);
  }

  private fillEllipse(cx: number, cy: number, rx: number, ry: number): void {
    this.cloudsGraphics.beginPath();
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const px = cx + Math.cos(a) * rx;
      const py = cy + Math.sin(a) * ry;
      if (i === 0) this.cloudsGraphics.moveTo(px, py);
      else this.cloudsGraphics.lineTo(px, py);
    }
    this.cloudsGraphics.closePath();
    this.cloudsGraphics.fillPath();
  }

  // --- Far Hills (big, slow, depth 2) ---

  private generateFarHills(scene: Scene): void {
    const tileWidth = Math.ceil(this.W * 1.5);
    const hillHeight = 240; // increased max height

    const tempGraphics = scene.add.graphics();
    tempGraphics.setVisible(false);
    tempGraphics.fillStyle(0x2d7a2d);
    tempGraphics.beginPath();
    tempGraphics.moveTo(0, hillHeight);

    for (let x = 0; x <= tileWidth; x += 2) {
      const t = (x / tileWidth) * Math.PI * 2;
      const h = 80 + Math.sin(t) * 60 + Math.sin(t * 2) * 30 + Math.sin(t * 3) * 12;
      tempGraphics.lineTo(x, hillHeight - h);
    }

    tempGraphics.lineTo(tileWidth, hillHeight);
    tempGraphics.closePath();
    tempGraphics.fillPath();

    tempGraphics.generateTexture('far_hills_tile', tileWidth, hillHeight);
    tempGraphics.destroy();

    this.farHillsTileSprite = scene.add.tileSprite(
      this.W / 2,
      this.groundTop - hillHeight / 2,
      this.W,
      hillHeight,
      'far_hills_tile'
    );
    this.farHillsTileSprite.setDepth(2);
    this.farHillsTileSprite.setAlpha(1);
  }

  private scrollFarHills(): void {
    this.farHillsTileSprite.tilePositionX = this.farHillsScrollX;
  }

  // --- Towns (between far and near hills, depth 2.5) ---

  private generateTowns(): void {
    // Place towns sparsely across a wide wrap area
    this.townWrapWidth = this.W * 6;
    this.towns = [];
    const townCount = 3; // sparse

    for (let t = 0; t < townCount; t++) {
      const townX = (t + 0.5) * (this.townWrapWidth / townCount) + (Math.random() - 0.5) * this.W;
      const buildingCount = 6 + Math.floor(Math.random() * 6);
      const buildings: Building[] = [];
      let bx = 0;

      for (let b = 0; b < buildingCount; b++) {
        const bWidth = 25 + Math.random() * 35;
        const bHeight = 60 + Math.random() * 160;
        const windowCols = Math.floor(bWidth / 12);
        const windowRows = Math.floor(bHeight / 16);
        const windows: { row: number; col: number; seed: number }[] = [];

        for (let row = 0; row < windowRows; row++) {
          for (let col = 0; col < windowCols; col++) {
            windows.push({ row, col, seed: Math.random() });
          }
        }

        buildings.push({ x: bx, width: bWidth, height: bHeight, windows });
        // Overlap buildings slightly (negative or small gap)
        bx += bWidth * 0.6 + Math.random() * 5;
      }

      // Track actual rendered width (last building right edge)
      const lastBuilding = buildings[buildings.length - 1];
      const actualWidth = lastBuilding.x + lastBuilding.width;
      this.towns.push({ x: townX, width: actualWidth, buildings });
    }
  }

  private drawTowns(darkness: number): void {
    this.townGraphics.clear();

    for (const town of this.towns) {
      // tx is the left edge position of the town after scrolling
      const tx = ((town.x - this.townScrollX) % this.townWrapWidth + this.townWrapWidth) % this.townWrapWidth - town.width;
      // Skip if right edge is off the left side, or left edge is off the right side
      if (tx + town.width < 0 || tx > this.W) continue;

      for (const building of town.buildings) {
        const bx = tx + building.x;
        const by = this.groundTop - building.height;

        // Building body — grey
        const bodyColor = darkness > 0.3 ? 0x3a3a4a : 0x5a5a6a;
        this.townGraphics.fillStyle(bodyColor);
        this.townGraphics.fillRect(bx, by, building.width, building.height);

        // Windows
        const winW = 6;
        const winH = 8;
        const padX = (building.width - Math.floor(building.width / 12) * 12) / 2 + 3;
        const padY = 8;

        for (const win of building.windows) {
          const wx = bx + padX + win.col * 12;
          const wy = by + padY + win.row * 16;

          // Window lights up based on darkness: at 0.2 darkness, 0% lit;
          // at max darkness, 90-100% lit. Each window has a random seed (0..1)
          // determining when it turns on.
          const litChance = darkness <= 0.2 ? 0 : 0.9 * ((darkness - 0.2) / 0.8);
          const isLit = win.seed < litChance;

          if (isLit) {
            this.townGraphics.fillStyle(0xffdd44, 0.9);
          } else {
            this.townGraphics.fillStyle(0x88bbdd, 0.7);
          }
          this.townGraphics.fillRect(wx, wy, winW, winH);
        }
      }
    }
  }

  // --- Near Hills (small, fast, depth 2.7, in front of towns) ---

  private generateNearHills(scene: Scene): void {
    const tileWidth = Math.ceil(this.W * 1.2);
    const hillHeight = 90; // much smaller

    const tempGraphics = scene.add.graphics();
    tempGraphics.setVisible(false);
    tempGraphics.fillStyle(0x4a9e4a);
    tempGraphics.beginPath();
    tempGraphics.moveTo(0, hillHeight);

    for (let x = 0; x <= tileWidth; x += 2) {
      const t = (x / tileWidth) * Math.PI * 2;
      const h = 30 + Math.sin(t * 2) * 22 + Math.sin(t * 3) * 10;
      tempGraphics.lineTo(x, hillHeight - h);
    }

    tempGraphics.lineTo(tileWidth, hillHeight);
    tempGraphics.closePath();
    tempGraphics.fillPath();

    tempGraphics.generateTexture('near_hills_tile', tileWidth, hillHeight);
    tempGraphics.destroy();

    this.nearHillsTileSprite = scene.add.tileSprite(
      this.W / 2,
      this.groundTop - hillHeight / 2,
      this.W,
      hillHeight,
      'near_hills_tile'
    );
    this.nearHillsTileSprite.setDepth(2.7);
    this.nearHillsTileSprite.setAlpha(1);
  }

  private scrollNearHills(): void {
    this.nearHillsTileSprite.tilePositionX = this.nearHillsScrollX;
  }

  // --- Sky Objects (moon, shooting stars, flocks, planes) ---

  private initMoon(): void {
    this.moonX = this.W + 60;
    this.moonY = this.groundTop * 0.08 + Math.random() * this.groundTop * 0.12;
  }

  private drawSkyObjects(dt: number, darkness: number): void {
    this.skyGraphics.clear();

    this.updateMoon(dt, darkness);
    this.updateShootingStars(dt, darkness);
    this.updateFlocks(dt, darkness);
  }

  // --- Moon ---

  private updateMoon(dt: number, darkness: number): void {
    // Moon visible when darkness > 0.3, fades out below 0.3
    if (darkness < 0.2) return;

    this.moonX += this.moonVx * dt;
    this.moonY += this.moonVy * dt;

    if (this.moonX < -80) {
      this.moonX = this.W + 60;
      this.moonY = this.groundTop * 0.08 + Math.random() * this.groundTop * 0.12;
    }

    const moonAlpha = Math.min(1, (darkness - 0.2) / 0.2);
    // Full moon body
    this.skyGraphics.fillStyle(0xdddddd, moonAlpha * 0.95);
    this.skyGraphics.fillCircle(this.moonX, this.moonY, 36);

    // Craters (darker spots)
    this.skyGraphics.fillStyle(0xbbbbbb, moonAlpha * 0.7);
    this.skyGraphics.fillCircle(this.moonX - 10, this.moonY - 8, 8);
    this.skyGraphics.fillCircle(this.moonX + 12, this.moonY + 6, 6);
    this.skyGraphics.fillCircle(this.moonX - 4, this.moonY + 14, 5);
    this.skyGraphics.fillCircle(this.moonX + 6, this.moonY - 14, 4);
    this.skyGraphics.fillCircle(this.moonX - 16, this.moonY + 6, 3);
    this.skyGraphics.fillCircle(this.moonX + 18, this.moonY - 5, 3.5);
    this.skyGraphics.fillCircle(this.moonX - 2, this.moonY - 20, 2.5);
    this.skyGraphics.fillCircle(this.moonX + 8, this.moonY + 18, 3);
  }

  // --- Shooting Stars ---

  private updateShootingStars(dt: number, darkness: number): void {
    if (darkness < 0.5) return;

    // Spawn rarely
    this.shootingStarTimer += dt;
    if (this.shootingStarTimer > 15 + Math.random() * 25) {
      this.shootingStarTimer = 0;
      this.shootingStars.push({
        x: Math.random() * this.W * 0.8,
        y: Math.random() * this.groundTop * 0.4,
        vx: 300 + Math.random() * 200,
        vy: 100 + Math.random() * 80,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
      });
    }

    // Update and draw
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.life += dt;
      ss.x += ss.vx * dt;
      ss.y += ss.vy * dt;

      if (ss.life >= ss.maxLife) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      const alpha = 1 - ss.life / ss.maxLife;
      const tailLen = 20;
      this.skyGraphics.lineStyle(2, 0xffffff, alpha);
      this.skyGraphics.lineBetween(
        ss.x, ss.y,
        ss.x - ss.vx * dt * tailLen, ss.y - ss.vy * dt * tailLen
      );
    }
  }

  // --- Bird Flocks ---

  private updateFlocks(dt: number, darkness: number): void {
    // Flocks only during daytime
    if (darkness > 0.5) return;

    this.flockTimer += dt;
    if (this.flockTimer > 25 + Math.random() * 40) {
      this.flockTimer = 0;
      // Only spawn if no flocks currently on screen
      if (this.flocks.length === 0) {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const startX = direction === 1 ? -60 - Math.random() * 40 : this.W + 60 + Math.random() * 40;
        // Same direction as player (right) = slower, opposite = faster
        const speed = direction === 1 ? 15 + Math.random() * 20 : 50 + Math.random() * 40;
        this.flocks.push({
          x: startX,
          y: 20 + Math.random() * this.groundTop * 0.4,
          speed,
          direction,
          birdCount: 3 + Math.floor(Math.random() * 6),
          spacing: 10 + Math.random() * 12,
          flapOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const flock = this.flocks[i];
      flock.x += flock.speed * flock.direction * dt;

      // Off-screen check based on direction
      if (flock.direction === 1 && flock.x > this.W + 150) {
        this.flocks.splice(i, 1);
        continue;
      }
      if (flock.direction === -1 && flock.x < -150) {
        this.flocks.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, 1 - darkness * 2) * 0.6;
      this.skyGraphics.lineStyle(1.5, 0x222222, alpha);

      // Draw loose V-formation with flapping wings
      for (let b = 0; b < flock.birdCount; b++) {
        const side = b % 2 === 0 ? 1 : -1;
        const idx = Math.ceil(b / 2);
        // Consistent horizontal offset, subtle vertical bob only
        const jitterY = Math.sin(this.elapsedTime * 1.2 + b * 1.5) * 1.5;
        const bx = flock.x - flock.direction * idx * flock.spacing * 0.7;
        const by = flock.y + side * idx * flock.spacing * 0.4 + jitterY;

        // Flapping: all birds in sync with slight per-bird phase offset
        const flapPhase = this.elapsedTime * 4 + flock.flapOffset + b * 0.3;
        const wingDip = Math.sin(flapPhase) * 3;
        const wingSize = 4;

        this.skyGraphics.lineBetween(bx - wingSize, by + wingDip, bx, by);
        this.skyGraphics.lineBetween(bx, by, bx + wingSize, by + wingDip);
      }
    }
  }

}
