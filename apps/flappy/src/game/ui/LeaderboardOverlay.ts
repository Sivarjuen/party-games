import { ScoreEntry, LeaderboardResponse } from '../../api/scores';
import { getMedalForScore } from './Medal';

type Period = 'daily' | 'weekly' | 'monthly' | 'allTime';

const PERIOD_LABELS: Record<Period, string> = {
  daily: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
  allTime: 'All Time',
};

export class LeaderboardOverlay {
  private container: HTMLDivElement;
  private activePeriod: Period = 'daily';
  private data: LeaderboardResponse | null = null;
  private playerName: string | null = null;
  private onCloseCallback: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'leaderboard-overlay';
    // Prevent game input
    this.container.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.container.addEventListener('keydown', (e) => e.stopPropagation());
  }

  show(data: LeaderboardResponse, playerName: string | null, onClose: () => void): void {
    this.data = data;
    this.playerName = playerName;
    this.onCloseCallback = onClose;
    this.render();
    document.body.appendChild(this.container);
  }

  private render(): void {
    if (!this.data) return;

    const scores = this.data[this.activePeriod];
    const playerRank = this.data.playerRanks?.[this.activePeriod];
    const playerInTop = this.playerName && scores.some(e => e.player_name === this.playerName);

    this.container.innerHTML = `
      <div class="leaderboard-card">
        <h2 class="leaderboard-title">🏆 Highscores</h2>
        <div class="lb-tab-bar">
          ${(Object.keys(PERIOD_LABELS) as Period[]).map(p => `
            <button class="lb-tab ${p === this.activePeriod ? 'active' : ''}" data-period="${p}">
              ${PERIOD_LABELS[p]}
            </button>
          `).join('')}
        </div>
        <div class="lb-scores-list">
          ${scores.length === 0 ? '<p class="lb-empty">No scores yet. Be the first!</p>' : ''}
          ${scores.map((entry, i) => this.renderRow(entry, i + 1)).join('')}
          ${!playerInTop && playerRank ? this.renderPlayerRank(playerRank) : ''}
        </div>
        <button class="lb-back-btn" id="lb-back">Back</button>
      </div>
    `;

    // Wire up tabs
    this.container.querySelectorAll('.lb-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activePeriod = (btn as HTMLElement).dataset.period as Period;
        this.render();
      });
    });

    // Wire up back button
    this.container.querySelector('#lb-back')?.addEventListener('click', () => this.close());
  }

  private renderRow(entry: ScoreEntry, rank: number): string {
    const isPlayer = entry.player_name === this.playerName;
    const medal = getMedalForScore(entry.score);
    const medalStr = medal ? ` ${medal.name}` : '';
    return `
      <div class="lb-row ${isPlayer ? 'lb-row-highlight' : ''}">
        <span class="lb-rank">${rank}.</span>
        <span class="lb-name">${this.escapeHtml(entry.player_name)}</span>
        <span class="lb-score">${entry.score}${medalStr}</span>
      </div>
    `;
  }

  private renderPlayerRank(pr: { rank: number; entry: ScoreEntry }): string {
    const medal = getMedalForScore(pr.entry.score);
    const medalStr = medal ? ` ${medal.name}` : '';
    return `
      <div class="lb-separator">···</div>
      <div class="lb-row lb-row-highlight">
        <span class="lb-rank">${pr.rank}.</span>
        <span class="lb-name">${this.escapeHtml(pr.entry.player_name)}</span>
        <span class="lb-score">${pr.entry.score}${medalStr}</span>
      </div>
    `;
  }

  private close(): void {
    this.container.remove();
    this.onCloseCallback?.();
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[c] ?? c;
    });
  }
}
