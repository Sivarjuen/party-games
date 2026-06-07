import { Scene, GameObjects } from 'phaser';
import {
  ROWS, COLS, CELL_SIZE, CHIP_RADIUS,
  BOARD_COLOR, BOARD_BORDER_COLOR,
  CHIP_RED, CHIP_YELLOW, Player,
} from '../constants';
import {
  Grid, createEmptyGrid, checkWin, isBoardFull, isColumnAvailable, WinResult,
} from '../logic/Board';
import { getAIMove } from '../logic/AI';

enum GameState {
  PLAYING,
  DROPPING,
  AI_THINKING,
  WIN,
  TIE,
}

type GameMode = 'local' | 'ai';

export class GameScene extends Scene {
  private grid!: Grid;
  private currentPlayer: Player = Player.RED;
  private state: GameState = GameState.PLAYING;
  private mode: GameMode = 'local';
  private aiName: string = '';

  private boardGraphics!: GameObjects.Graphics;
  private boardImage: GameObjects.Image | null = null;
  private chipsGraphics!: GameObjects.Graphics;
  private previewGraphics!: GameObjects.Graphics;
  private headerText!: GameObjects.Text;
  private resultText!: GameObjects.Text;
  private playAgainBtn!: GameObjects.Graphics;
  private playAgainText!: GameObjects.Text;
  private playAgainZone!: GameObjects.Zone;

  private boardOffsetX!: number;
  private boardOffsetY!: number;
  private hoveredCol: number = -1;
  private winResult: WinResult | null = null;
  private skipNextUp: boolean = false;

  constructor() {
    super('GameScene');
  }

  private static readonly AI_NAMES = ['Maya (AI)', 'Tiger (AI)', 'Leo (AI)', 'Max (AI)', 'Jack (AI)'];

  init(data: { mode?: string }): void {
    this.mode = (data.mode === 'ai') ? 'ai' : 'local';
    this.aiName = GameScene.AI_NAMES[Math.floor(Math.random() * GameScene.AI_NAMES.length)];
  }

  create(): void {
    const W = this.scale.width;

    this.boardImage = null;

    this.boardOffsetX = (W - COLS * CELL_SIZE) / 2;
    const H = this.scale.height;
    const boardH = ROWS * CELL_SIZE;
    // Center the board vertically with some space above for header and preview row
    this.boardOffsetY = (H - boardH) / 2 + CELL_SIZE * 0.5;

    // Graphics layers
    // Chips render behind board
    this.chipsGraphics = this.add.graphics();
    this.chipsGraphics.setDepth(0);

    // Board with real cutout holes (rendered to texture once)
    this.boardGraphics = this.add.graphics();
    this.boardGraphics.setDepth(2);

    // Preview above everything
    this.previewGraphics = this.add.graphics();
    this.previewGraphics.setDepth(3);

    // Header
    this.headerText = this.add.text(W / 2, 80, '', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '56px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    // Result text
    this.resultText = this.add.text(W / 2, 80, '', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '64px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5).setVisible(false);

    // Play again button (hidden until game ends)
    const btnW = 320;
    const btnH = 80;
    const btnX = W / 2;
    const btnY = this.boardOffsetY - CELL_SIZE / 2;

    this.playAgainBtn = this.add.graphics();
    this.playAgainBtn.fillStyle(0x2266cc, 1);
    this.playAgainBtn.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 12);
    this.playAgainBtn.setVisible(false).setDepth(5);

    this.playAgainText = this.add.text(btnX, btnY, 'Play Again', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5).setVisible(false).setDepth(5);

    this.playAgainZone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true });
    this.playAgainZone.on('pointerup', () => {
      if (this.state === GameState.WIN || this.state === GameState.TIE) {
        this.skipNextUp = true;
        this.startNewGame();
      }
    });
    this.playAgainZone.setActive(false);

    // Home button (top-left)
    const homeBtn = this.add.text(50, 80, '🏠', {
      fontSize: '48px',
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(15).setAlpha(0.7).setInteractive({ useHandCursor: true });
    homeBtn.on('pointerup', () => {
      this.skipNextUp = true;
      this.scene.start('MenuScene');
    });

    // Input
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.startNewGame();
  }

  private startNewGame(): void {
    this.grid = createEmptyGrid();
    this.currentPlayer = Player.RED;
    this.state = GameState.PLAYING;
    this.winResult = null;
    this.hoveredCol = -1;

    this.headerText.setVisible(true);
    this.resultText.setVisible(false);
    this.playAgainBtn.setVisible(false);
    this.playAgainText.setVisible(false);
    this.playAgainZone.setActive(false);

    this.updateHeader();
    this.drawBoard();
    this.drawChips();
    this.previewGraphics.clear();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.state !== GameState.PLAYING) return;
    if (this.mode === 'ai' && this.currentPlayer === Player.YELLOW) return;

    const col = this.getColumnFromX(pointer.x);
    if (col !== this.hoveredCol) {
      this.hoveredCol = col;
      this.drawPreview();
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state !== GameState.PLAYING) return;
    if (this.mode === 'ai' && this.currentPlayer === Player.YELLOW) return;

    const col = this.getColumnFromX(pointer.x);
    this.hoveredCol = col;
    this.drawPreview();
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.skipNextUp) {
      this.skipNextUp = false;
      return;
    }
    if (this.state !== GameState.PLAYING) return;
    if (this.mode === 'ai' && this.currentPlayer === Player.YELLOW) return;

    const col = this.getColumnFromX(pointer.x);
    this.placeChip(col);
  }

  private placeChip(col: number): void {
    if (col < 0 || col >= COLS) return;
    if (!isColumnAvailable(this.grid, col)) return;

    // Find the landing row without committing yet
    let landingRow = -1;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.grid[row][col] === Player.NONE) {
        landingRow = row;
        break;
      }
    }
    if (landingRow < 0) return;

    this.state = GameState.DROPPING;
    this.previewGraphics.clear();

    const x = this.boardOffsetX + col * CELL_SIZE + CELL_SIZE / 2;
    const startY = this.boardOffsetY - CELL_SIZE / 2;
    const endY = this.boardOffsetY + landingRow * CELL_SIZE + CELL_SIZE / 2;
    const color = this.currentPlayer === Player.RED ? CHIP_RED : CHIP_YELLOW;
    const player = this.currentPlayer;

    // Create a temporary circle for the animation (behind board overlay)
    const dropChipGraphics = this.add.graphics();
    dropChipGraphics.setDepth(1);
    dropChipGraphics.fillStyle(color);
    dropChipGraphics.fillCircle(0, 0, CHIP_RADIUS);
    dropChipGraphics.fillStyle(0xffffff, 0.15);
    dropChipGraphics.fillCircle(-6, -6, CHIP_RADIUS * 0.45);
    dropChipGraphics.setPosition(x, startY);

    // Animate the drop
    const distance = endY - startY;
    const duration = 80 + distance * 0.4; // faster for short drops

    this.tweens.add({
      targets: dropChipGraphics,
      y: endY,
      duration,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        dropChipGraphics.destroy();

        // Commit the chip to the grid
        this.grid[landingRow][col] = player;
        this.drawChips();

        // Check win
        const result = checkWin(this.grid);
        if (result) {
          this.winResult = result;
          this.state = GameState.WIN;
          this.onGameEnd();
          return;
        }

        // Check tie
        if (isBoardFull(this.grid)) {
          this.state = GameState.TIE;
          this.onGameEnd();
          return;
        }

        // Switch player
        this.currentPlayer = this.currentPlayer === Player.RED ? Player.YELLOW : Player.RED;
        this.state = GameState.PLAYING;
        this.updateHeader();

        // If AI mode and it's AI's turn, trigger AI move
        if (this.mode === 'ai' && this.currentPlayer === Player.YELLOW) {
          this.state = GameState.AI_THINKING;
          this.previewGraphics.clear();
          const thinkTime = 600 + Math.random() * 800;
          this.time.delayedCall(thinkTime, () => {
            const aiCol = getAIMove(this.grid, Player.YELLOW);
            this.state = GameState.PLAYING;
            this.currentPlayer = Player.YELLOW;
            this.placeChip(aiCol);
          });
        } else {
          this.drawPreview();
        }
      },
    });
  }

  private onGameEnd(): void {
    this.headerText.setVisible(false);
    this.previewGraphics.clear();

    if (this.state === GameState.WIN && this.winResult) {
      const colorName = this.winResult.winner === Player.RED ? 'Red' : 'Yellow';
      const hexColor = this.winResult.winner === Player.RED ? '#e63946' : '#f4d35e';
      if (this.mode === 'ai') {
        const label = this.winResult.winner === Player.RED ? 'You Win!' : `${this.aiName} Wins!`;
        this.resultText.setText(label);
      } else {
        this.resultText.setText(`${colorName} Wins!`);
      }
      this.resultText.setColor(hexColor);
      this.drawChips();
    } else {
      this.resultText.setText("It's a Tie!");
      this.resultText.setColor('#ffffff');
    }

    this.resultText.setVisible(true);
    this.playAgainBtn.setVisible(true);
    this.playAgainText.setVisible(true);
    this.playAgainZone.setActive(true);
  }

  private getColumnFromX(x: number): number {
    const relX = x - this.boardOffsetX;
    if (relX < 0 || relX >= COLS * CELL_SIZE) return -1;
    return Math.floor(relX / CELL_SIZE);
  }

  private updateHeader(): void {
    if (this.mode === 'ai') {
      if (this.currentPlayer === Player.RED) {
        this.headerText.setText('Your Turn');
        this.headerText.setColor('#e63946');
      } else {
        this.headerText.setText(`${this.aiName} is thinking...`);
        this.headerText.setColor('#f4d35e');
      }
    } else {
      const colorName = this.currentPlayer === Player.RED ? 'Red' : 'Yellow';
      const hexColor = this.currentPlayer === Player.RED ? '#e63946' : '#f4d35e';
      this.headerText.setText(`${colorName}'s Turn`);
      this.headerText.setColor(hexColor);
    }
  }

  private drawPreview(): void {
    this.previewGraphics.clear();
    if (this.hoveredCol < 0 || this.hoveredCol >= COLS) return;
    if (!isColumnAvailable(this.grid, this.hoveredCol)) return;

    const color = this.currentPlayer === Player.RED ? CHIP_RED : CHIP_YELLOW;
    const x = this.boardOffsetX + this.hoveredCol * CELL_SIZE + CELL_SIZE / 2;

    // Preview chip above the board
    const previewY = this.boardOffsetY - CELL_SIZE / 2;
    this.previewGraphics.fillStyle(color, 0.5);
    this.previewGraphics.fillCircle(x, previewY, CHIP_RADIUS);

    // Ghost chip showing landing position
    for (let row = ROWS - 1; row >= 0; row--) {
      if (this.grid[row][this.hoveredCol] === Player.NONE) {
        const landY = this.boardOffsetY + row * CELL_SIZE + CELL_SIZE / 2;
        this.previewGraphics.fillStyle(color, 0.25);
        this.previewGraphics.fillCircle(x, landY, CHIP_RADIUS);
        break;
      }
    }
  }

  private drawBoard(): void {
    this.boardGraphics.clear();

    const boardW = COLS * CELL_SIZE;
    const boardH = ROWS * CELL_SIZE;
    const bx = this.boardOffsetX - 8;
    const by = this.boardOffsetY - 8;
    const bw = boardW + 16;
    const bh = boardH + 16;

    const key = 'board_frame';
    const W = this.scale.width;
    const H = this.scale.height;

    // Create or reuse the canvas texture
    let canvas: Phaser.Textures.CanvasTexture;
    if (this.textures.exists(key)) {
      canvas = this.textures.get(key) as Phaser.Textures.CanvasTexture;
      canvas.clear();
    } else {
      canvas = this.textures.createCanvas(key, W, H)!;
    }
    const ctx = canvas.context;

    // Draw rounded rect for board
    ctx.fillStyle = `#${BOARD_COLOR.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = `#${BOARD_BORDER_COLOR.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 12);
    ctx.stroke();

    // Cut out holes using destination-out composite
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'white';
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = this.boardOffsetX + col * CELL_SIZE + CELL_SIZE / 2;
        const y = this.boardOffsetY + row * CELL_SIZE + CELL_SIZE / 2;
        ctx.beginPath();
        ctx.arc(x, y, CHIP_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    canvas.refresh();

    // Create the board image
    if (this.boardImage) {
      this.boardImage.setTexture(key);
    } else {
      this.boardImage = this.add.image(0, 0, key).setOrigin(0, 0).setDepth(2);
    }
  }

  private drawChips(): void {
    this.chipsGraphics.clear();

    const winCells = this.winResult?.cells || [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const player = this.grid[row][col];
        if (player === Player.NONE) continue;

        const x = this.boardOffsetX + col * CELL_SIZE + CELL_SIZE / 2;
        const y = this.boardOffsetY + row * CELL_SIZE + CELL_SIZE / 2;
        const color = player === Player.RED ? CHIP_RED : CHIP_YELLOW;

        const isWinCell = winCells.some(c => c.row === row && c.col === col);

        this.chipsGraphics.fillStyle(color);
        this.chipsGraphics.fillCircle(x, y, CHIP_RADIUS);

        // Highlight winning chips
        if (isWinCell) {
          this.chipsGraphics.lineStyle(4, 0xffffff, 1);
          this.chipsGraphics.strokeCircle(x, y, CHIP_RADIUS - 2);
        }

        // Inner highlight for 3D effect
        this.chipsGraphics.fillStyle(0xffffff, 0.15);
        this.chipsGraphics.fillCircle(x - 6, y - 6, CHIP_RADIUS * 0.45);
      }
    }
  }
}
