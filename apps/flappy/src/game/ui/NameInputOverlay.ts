const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 12;
const STORAGE_KEY = 'flappy_player_name';

export class NameInputOverlay {
  private container: HTMLDivElement;
  private input: HTMLInputElement;
  private errorText: HTMLSpanElement | null = null;
  private resolvePromise: ((name: string) => void) | null = null;

  constructor(private score: number) {
    this.container = document.createElement('div');
    this.input = document.createElement('input');
    this.build();
  }

  /** Shows the overlay and returns the player name when submitted */
  show(): Promise<string> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      document.body.appendChild(this.container);
      setTimeout(() => this.input.focus(), 100);
    });
  }

  private build(): void {
    const savedName = localStorage.getItem(STORAGE_KEY) ?? '';

    this.container.id = 'name-input-overlay';
    this.container.innerHTML = `
      <div class="name-input-card">
        <h2>Score: ${this.score}</h2>
        <p>Enter your name for the leaderboard</p>
        <form id="name-form">
          <input
            type="text"
            id="player-name-input"
            minlength="${MIN_NAME_LENGTH}"
            maxlength="${MAX_NAME_LENGTH}"
            placeholder="Your name (3-12 chars)"
            value="${this.escapeHtml(savedName)}"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="submit">Submit</button>
        </form>
        <span class="name-error" id="name-error"></span>
      </div>
    `;

    this.input = this.container.querySelector('#player-name-input') as HTMLInputElement;
    this.errorText = this.container.querySelector('#name-error') as HTMLSpanElement;

    const form = this.container.querySelector('#name-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });

    // Prevent game input while overlay is up
    this.container.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.container.addEventListener('keydown', (e) => e.stopPropagation());
  }

  private submit(): void {
    const name = this.input.value.trim();
    if (name.length < MIN_NAME_LENGTH) {
      this.showError(`Name must be at least ${MIN_NAME_LENGTH} characters`);
      this.input.focus();
      return;
    }
    localStorage.setItem(STORAGE_KEY, name);
    this.destroy();
    this.resolvePromise?.(name);
  }

  private showError(msg: string): void {
    if (this.errorText) {
      this.errorText.textContent = msg;
    }
  }

  private destroy(): void {
    this.container.remove();
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (c) => {
      const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
      return map[c] ?? c;
    });
  }
}
