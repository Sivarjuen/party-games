// Game constants — avoid magic numbers throughout the code

// Bird
export const FLAP_FORCE = -420;
export const GRAVITY = 1200;
export const MAX_FALL_SPEED = 800;
export const BIRD_START_X_RATIO = 0.25; // fraction of screen width
export const BIRD_START_Y_RATIO = 0.5;
export const BIRD_WIDTH = 40;
export const BIRD_HEIGHT = 30;
export const BIRD_ROTATION_UP = -0.4; // radians
export const BIRD_ROTATION_DOWN = 1.2; // radians
export const BIRD_ROTATION_SPEED = 3; // radians per second toward target

// Pipes
export const PIPE_SPEED = 280;
export const PIPE_GAP = 300;
export const PIPE_WIDTH = 70;
export const PIPE_SPAWN_INTERVAL = 1600; // ms
export const PIPE_GAP_MIN_Y = 0.2; // fraction of playable height
export const PIPE_GAP_MAX_Y = 0.7; // fraction of playable height

// Gap progression: [cumulativePipeCount, gapSize]
// After the last threshold, gap stays at the final value
export const GAP_PROGRESSION: [number, number][] = [
  [5, 250],
  [10, 225],
  [20, 200],
  [30, 190],
  [50, 180],
  [80, 160],
  [100, 140],
  [Infinity, 120]
]

// Ground
export const GROUND_HEIGHT = 50;

// Score
export const HIGH_SCORE_KEY = 'flappy_high_score';

// Debug
export const DEBUG_INVINCIBLE = import.meta.env.VITE_DEBUG_INVINCIBLE === 'true';

// Pipe color progression: [scoreThreshold, bodyColor, capColor]
export const PIPE_COLOR_TIERS: [number, number, number][] = [
  [0, 0x4caf50, 0x388e3c],    // Green
  [25, 0xff8c00, 0xcc7000],   // Orange
  [50, 0x7b1fa2, 0x5c1680],   // Purple
  [75, 0xd32f2f, 0xa12424],   // Red
  [100, 0xffd700, 0xccac00],  // Gold
  [125, 0xeeeeee, 0xcccccc],  // White
  [150, 0x222222, 0x111111],  // Black
];

export const COLOR_BIRD = 0xf5dd42;
export const COLOR_PIPE = 0x4caf50;
export const COLOR_GROUND = 0x8b5e3c;
export const COLOR_SKY = 0x70c5ce;
export const COLOR_SCORE = '#ffffff';

// Medal thresholds
export const MEDAL_TIERS: { threshold: number; name: string; color: number }[] = [
  { threshold: 150, name: '💎', color: 0x00e5ff },  // Diamond
  { threshold: 100, name: '🥇', color: 0xffd700 },  // Gold
  { threshold: 60, name: '🥈', color: 0xc0c0c0 },   // Silver
  { threshold: 25, name: '🥉', color: 0xcd7f32 },   // Bronze
];
