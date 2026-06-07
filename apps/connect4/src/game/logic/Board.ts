import { ROWS, COLS, WIN_LENGTH, Player } from '../constants';

export type Grid = Player[][];

export interface WinResult {
  winner: Player;
  cells: { row: number; col: number }[];
}

export function createEmptyGrid(): Grid {
  const grid: Grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push(new Array(COLS).fill(Player.NONE));
  }
  return grid;
}

/**
 * Drop a chip into a column. Returns the row it landed in, or -1 if column is full.
 */
export function dropChip(grid: Grid, col: number, player: Player): number {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (grid[row][col] === Player.NONE) {
      grid[row][col] = player;
      return row;
    }
  }
  return -1; // column full
}

/**
 * Check if the board has a winner. Returns the winner and winning cells, or null.
 */
export function checkWin(grid: Grid): WinResult | null {
  // Directions: right, down, down-right, down-left
  const directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: 1, dc: -1 },
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const player = grid[row][col];
      if (player === Player.NONE) continue;

      for (const { dr, dc } of directions) {
        const cells: { row: number; col: number }[] = [];
        let valid = true;

        for (let i = 0; i < WIN_LENGTH; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS || grid[r][c] !== player) {
            valid = false;
            break;
          }
          cells.push({ row: r, col: c });
        }

        if (valid) {
          return { winner: player, cells };
        }
      }
    }
  }

  return null;
}

/**
 * Check if the board is completely full (tie).
 */
export function isBoardFull(grid: Grid): boolean {
  for (let col = 0; col < COLS; col++) {
    if (grid[0][col] === Player.NONE) return false;
  }
  return true;
}

/**
 * Check if a column can accept another chip.
 */
export function isColumnAvailable(grid: Grid, col: number): boolean {
  return grid[0][col] === Player.NONE;
}
