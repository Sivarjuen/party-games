import { ROWS, COLS, WIN_LENGTH, Player } from '../constants';
import { Grid, checkWin, isColumnAvailable, dropChip } from './Board';

/**
 * Simple AI using minimax with alpha-beta pruning (depth-limited).
 * Evaluates board positions to make reasonably smart moves.
 */

const MAX_DEPTH = 5;

export function getAIMove(grid: Grid, aiPlayer: Player): number {
  const opponent = aiPlayer === Player.RED ? Player.YELLOW : Player.RED;

  // 1. Check if AI can win immediately
  for (let col = 0; col < COLS; col++) {
    if (!isColumnAvailable(grid, col)) continue;
    const copy = cloneGrid(grid);
    dropChip(copy, col, aiPlayer);
    if (checkWin(copy)?.winner === aiPlayer) return col;
  }

  // 2. Block opponent's immediate win
  for (let col = 0; col < COLS; col++) {
    if (!isColumnAvailable(grid, col)) continue;
    const copy = cloneGrid(grid);
    dropChip(copy, col, opponent);
    if (checkWin(copy)?.winner === opponent) return col;
  }

  // 3. Use minimax for deeper strategy
  let bestScore = -Infinity;
  let bestCol = -1;
  const availableCols = getAvailableCols(grid);

  for (const col of availableCols) {
    const copy = cloneGrid(grid);
    dropChip(copy, col, aiPlayer);
    const score = minimax(copy, MAX_DEPTH - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  // Fallback: pick center or first available
  if (bestCol === -1) {
    const center = Math.floor(COLS / 2);
    if (isColumnAvailable(grid, center)) return center;
    return availableCols[0];
  }

  return bestCol;
}

function minimax(
  grid: Grid,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  const result = checkWin(grid);
  if (result) {
    return result.winner === aiPlayer ? 10000 + depth : -10000 - depth;
  }

  if (depth === 0 || getAvailableCols(grid).length === 0) {
    return evaluateBoard(grid, aiPlayer);
  }

  const opponent = aiPlayer === Player.RED ? Player.YELLOW : Player.RED;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const col of getAvailableCols(grid)) {
      const copy = cloneGrid(grid);
      dropChip(copy, col, aiPlayer);
      const score = minimax(copy, depth - 1, alpha, beta, false, aiPlayer);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const col of getAvailableCols(grid)) {
      const copy = cloneGrid(grid);
      dropChip(copy, col, opponent);
      const score = minimax(copy, depth - 1, alpha, beta, true, aiPlayer);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

/**
 * Heuristic board evaluation: scores windows of 4 cells.
 */
function evaluateBoard(grid: Grid, aiPlayer: Player): number {
  let score = 0;
  const opponent = aiPlayer === Player.RED ? Player.YELLOW : Player.RED;

  // Prefer center column
  for (let row = 0; row < ROWS; row++) {
    if (grid[row][Math.floor(COLS / 2)] === aiPlayer) score += 3;
  }

  // Evaluate all windows of 4
  const directions = [
    { dr: 0, dc: 1 },  // horizontal
    { dr: 1, dc: 0 },  // vertical
    { dr: 1, dc: 1 },  // diagonal down-right
    { dr: 1, dc: -1 }, // diagonal down-left
  ];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      for (const { dr, dc } of directions) {
        const window: Player[] = [];
        for (let i = 0; i < WIN_LENGTH; i++) {
          const r = row + dr * i;
          const c = col + dc * i;
          if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
          window.push(grid[r][c]);
        }
        if (window.length === WIN_LENGTH) {
          score += scoreWindow(window, aiPlayer, opponent);
        }
      }
    }
  }

  return score;
}

function scoreWindow(window: Player[], aiPlayer: Player, opponent: Player): number {
  const aiCount = window.filter(c => c === aiPlayer).length;
  const oppCount = window.filter(c => c === opponent).length;
  const emptyCount = window.filter(c => c === Player.NONE).length;

  if (aiCount === 4) return 100;
  if (aiCount === 3 && emptyCount === 1) return 5;
  if (aiCount === 2 && emptyCount === 2) return 2;
  if (oppCount === 3 && emptyCount === 1) return -4;
  return 0;
}

function getAvailableCols(grid: Grid): number[] {
  const cols: number[] = [];
  // Check center first for better move ordering
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const col of order) {
    if (col < COLS && isColumnAvailable(grid, col)) {
      cols.push(col);
    }
  }
  return cols;
}

function cloneGrid(grid: Grid): Grid {
  return grid.map(row => [...row]);
}
