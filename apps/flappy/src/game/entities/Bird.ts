import { GameObjects, Scene } from 'phaser';
import {
  FLAP_FORCE,
  GRAVITY,
  MAX_FALL_SPEED,
  BIRD_WIDTH,
  BIRD_HEIGHT,
  BIRD_ROTATION_UP,
  BIRD_ROTATION_DOWN,
  BIRD_ROTATION_SPEED,
  COLOR_BIRD,
} from '../constants';

export class Bird {
  private graphics: GameObjects.Graphics;
  public x: number;
  public y: number;
  public velocityY: number = 0;
  public rotation: number = 0;
  public dead: boolean = false;
  public landed: boolean = false;
  private groundTop: number;
  private spinSpeed: number = 0;
  private wingAngle: number = 0; // 0 = resting, negative = raised

  constructor(scene: Scene, x: number, y: number, groundTop: number) {
    this.x = x;
    this.y = y;
    this.groundTop = groundTop;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(4);
    this.draw();
  }

  flap(): void {
    if (this.dead) return;
    this.velocityY = FLAP_FORCE;
    this.wingAngle = -1.2; // snap wing up
  }

  update(delta: number): void {
    if (this.dead) return;

    const dt = delta / 1000;

    // Apply gravity
    this.velocityY += GRAVITY * dt;
    if (this.velocityY > MAX_FALL_SPEED) {
      this.velocityY = MAX_FALL_SPEED;
    }

    this.y += this.velocityY * dt;

    // Rotation: tilt up when flapping, down when falling
    const targetRotation = this.velocityY < 0 ? BIRD_ROTATION_UP : BIRD_ROTATION_DOWN;
    const rotDiff = targetRotation - this.rotation;
    this.rotation += rotDiff * Math.min(1, BIRD_ROTATION_SPEED * dt);

    // Wing animation: relax back to resting
    if (this.wingAngle < 0) {
      this.wingAngle += 6 * dt; // spring back speed
      if (this.wingAngle > 0) this.wingAngle = 0;
    }

    this.draw();
  }

  die(): void {
    this.dead = true;
    this.landed = false;
    // Small upward bump on death (like getting "knocked")
    this.velocityY = FLAP_FORCE * 0.5;
    this.spinSpeed = 8 + Math.random() * 4; // radians/sec tumble
    this.draw();
  }

  /**
   * Call each frame after death — bird falls to ground with tumbling rotation.
   * Returns true once the bird has fully settled.
   */
  updateDead(delta: number): boolean {
    if (this.landed && Math.abs(this.spinSpeed) < 0.1) return true;

    const dt = delta / 1000;

    if (!this.landed) {
      // Gravity
      this.velocityY += GRAVITY * dt;
      if (this.velocityY > MAX_FALL_SPEED) {
        this.velocityY = MAX_FALL_SPEED;
      }
      this.y += this.velocityY * dt;

      // Tumble rotation
      this.rotation += this.spinSpeed * dt;

      // Check ground
      if (this.y + BIRD_HEIGHT / 2 >= this.groundTop) {
        this.y = this.groundTop - BIRD_HEIGHT / 2;
        this.velocityY = 0;
        this.landed = true;
      }
    } else {
      // On ground: keep rolling with friction
      this.rotation += this.spinSpeed * dt;
      this.spinSpeed *= (1 - 5 * dt); // friction decay

      // Stop once spin is negligible
      if (Math.abs(this.spinSpeed) < 0.1) {
        this.spinSpeed = 0;
      }
    }

    this.draw();
    return this.landed && this.spinSpeed === 0;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.velocityY = 0;
    this.rotation = 0;
    this.dead = false;
    this.landed = false;
    this.spinSpeed = 0;
    this.wingAngle = 0;
    this.draw();
  }

  getBounds(): Phaser.Geom.Rectangle {
    // Shrink hitbox for forgiving collisions
    const insetX = BIRD_WIDTH * 0.2;
    const insetY = BIRD_HEIGHT * 0.2;
    return new Phaser.Geom.Rectangle(
      this.x - BIRD_WIDTH / 2 + insetX,
      this.y - BIRD_HEIGHT / 2 + insetY,
      BIRD_WIDTH - insetX * 2,
      BIRD_HEIGHT - insetY * 2
    );
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.save();
    this.graphics.setDefaultStyles({ fillStyle: { color: COLOR_BIRD } });

    // Draw bird as an ellipse at position with rotation
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);

    // Use path for rotated ellipse
    this.graphics.beginPath();
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const lx = Math.cos(angle) * (BIRD_WIDTH / 2);
      const ly = Math.sin(angle) * (BIRD_HEIGHT / 2);
      const rx = this.x + lx * cos - ly * sin;
      const ry = this.y + lx * sin + ly * cos;
      if (i === 0) {
        this.graphics.moveTo(rx, ry);
      } else {
        this.graphics.lineTo(rx, ry);
      }
    }
    this.graphics.closePath();
    this.graphics.fillPath();

    // Wing (ellipse sticking out the left/back of the bird)
    // Pivot point is fixed on the bird body (right edge of wing)
    const wingPivotOffsetX = BIRD_WIDTH * 0.1;
    const wingPivotOffsetY = BIRD_HEIGHT * 0.05;
    const wingPivotX = this.x + wingPivotOffsetX * cos - wingPivotOffsetY * sin;
    const wingPivotY = this.y + wingPivotOffsetX * sin + wingPivotOffsetY * cos;

    const wingW = BIRD_WIDTH * 0.35;
    const wingH = BIRD_HEIGHT * 0.25;
    // Wing rotates around its pivot (right edge), so center is offset to the left
    const wingRot = this.rotation + this.wingAngle * 0.5;
    const wingCos = Math.cos(wingRot);
    const wingSin = Math.sin(wingRot);
    // Center of ellipse is one wingW to the left of the pivot
    const wingCX = wingPivotX - wingW * wingCos;
    const wingCY = wingPivotY - wingW * wingSin;

    this.graphics.fillStyle(0xd4b832); // darker shade of body yellow
    this.graphics.beginPath();
    const wingSteps = 12;
    for (let i = 0; i <= wingSteps; i++) {
      const a = (i / wingSteps) * Math.PI * 2;
      const lx = Math.cos(a) * wingW;
      const ly = Math.sin(a) * wingH;
      const wx = wingCX + lx * wingCos - ly * wingSin;
      const wy = wingCY + lx * wingSin + ly * wingCos;
      if (i === 0) {
        this.graphics.moveTo(wx, wy);
      } else {
        this.graphics.lineTo(wx, wy);
      }
    }
    this.graphics.closePath();
    this.graphics.fillPath();

    // Beak (orange triangle pointing right from the front of the bird)
    const beakTipOffsetX = BIRD_WIDTH * 0.75;
    const beakTipOffsetY = BIRD_HEIGHT * 0.05;
    const beakTipX = this.x + beakTipOffsetX * cos - beakTipOffsetY * sin;
    const beakTipY = this.y + beakTipOffsetX * sin + beakTipOffsetY * cos;
    const beakTopOffsetX = BIRD_WIDTH * 0.48;
    const beakTopOffsetY = -BIRD_HEIGHT * 0.12;
    const beakTopX = this.x + beakTopOffsetX * cos - beakTopOffsetY * sin;
    const beakTopY = this.y + beakTopOffsetX * sin + beakTopOffsetY * cos;
    const beakBotOffsetX = BIRD_WIDTH * 0.48;
    const beakBotOffsetY = BIRD_HEIGHT * 0.22;
    const beakBotX = this.x + beakBotOffsetX * cos - beakBotOffsetY * sin;
    const beakBotY = this.y + beakBotOffsetX * sin + beakBotOffsetY * cos;

    this.graphics.fillStyle(0xff8c00);
    this.graphics.beginPath();
    this.graphics.moveTo(beakTopX, beakTopY);
    this.graphics.lineTo(beakTipX, beakTipY);
    this.graphics.lineTo(beakBotX, beakBotY);
    this.graphics.closePath();
    this.graphics.fillPath();

    // Eye
    const eyeOffsetX = BIRD_WIDTH * 0.2;
    const eyeOffsetY = -BIRD_HEIGHT * 0.15;
    const eyeX = this.x + eyeOffsetX * cos - eyeOffsetY * sin;
    const eyeY = this.y + eyeOffsetX * sin + eyeOffsetY * cos;

    if (this.dead) {
      // Dead eyes: X shape
      this.graphics.lineStyle(3, 0x000000, 1);
      const crossSize = 4;
      this.graphics.lineBetween(
        eyeX - crossSize, eyeY - crossSize,
        eyeX + crossSize, eyeY + crossSize
      );
      this.graphics.lineBetween(
        eyeX + crossSize, eyeY - crossSize,
        eyeX - crossSize, eyeY + crossSize
      );
    } else {
      // Alive eyes: white circle with black pupil
      this.graphics.fillStyle(0xffffff);
      this.graphics.fillCircle(eyeX, eyeY, 5);
      this.graphics.fillStyle(0x000000);
      this.graphics.fillCircle(eyeX + 1.5, eyeY, 2.5);
    }

    this.graphics.restore();
  }
}
