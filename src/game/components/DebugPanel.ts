/**
 * Debug panel: activate with "D" key or long-press (800ms) on top-right corner. Shows card data, transcript, haptics/audio, FPS, session state. Gated by DEBUG_PANEL_ENABLED.
 */

import { DEBUG_PANEL_ENABLED } from '../constants';
import type { CardData } from '../types';

export interface DebugPanelData {
  currentCard: CardData | null;
  lastTranscriptRaw: string;
  lastTranscriptResolved: string | null;
  hapticsSupported: boolean;
  audioUnlocked: boolean;
  fps: number;
  sessionState: string;
}

const LONG_PRESS_MS = 800;

export interface DebugPanelOptions {
  onSoundCheck?: () => void | Promise<void>;
  onSimulateGuess?: () => void;
}

export class DebugPanel {
  private container: HTMLElement | null = null;
  private panelEl: HTMLElement | null = null;
  private getData: (() => DebugPanelData) | null = null;
  private onSoundCheck: (() => void | Promise<void>) | null = null;
  private onSimulateGuess: (() => void) | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  mount(root: HTMLElement, getData: () => DebugPanelData, options?: DebugPanelOptions): void {
    if (!DEBUG_PANEL_ENABLED) return;
    this.getData = getData;
    this.onSoundCheck = options?.onSoundCheck ?? null;
    this.onSimulateGuess = options?.onSimulateGuess ?? null;
    this.container = root;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'fixed top-4 right-4 w-10 h-10 rounded-full bg-gray-600/50 text-white text-xs z-40 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500';
    trigger.setAttribute('aria-label', 'Open debug panel');
    trigger.textContent = '?';
    trigger.addEventListener('mousedown', () => {
      this.longPressTimer = setTimeout(() => this.toggle(), LONG_PRESS_MS);
    });
    trigger.addEventListener('mouseup', () => {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    });
    trigger.addEventListener('mouseleave', () => {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    });
    root.appendChild(trigger);

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') {
        this.toggle();
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  private toggle(): void {
    if (this.panelEl) {
      this.panelEl.remove();
      this.panelEl = null;
      return;
    }
    if (!this.container || !this.getData) return;
    const data = this.getData();
    const panel = document.createElement('div');
    panel.className = 'fixed bottom-4 left-4 right-4 max-h-64 overflow-auto z-50 bg-gray-900 text-green-400 text-xs p-4 rounded-lg border border-gray-700 font-mono';
    panel.innerHTML = `
      <div class="font-bold mb-2">Debug</div>
      <pre>${escapeHtml(JSON.stringify({
        currentCard: data.currentCard,
        lastTranscriptRaw: data.lastTranscriptRaw,
        lastTranscriptResolved: data.lastTranscriptResolved,
        hapticsSupported: data.hapticsSupported,
        audioUnlocked: data.audioUnlocked,
        fps: data.fps.toFixed(1),
        sessionState: data.sessionState,
      }, null, 2))}</pre>
    `;
    const buttons = document.createElement('div');
    buttons.className = 'mt-2 flex gap-2 flex-wrap';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'px-2 py-1 bg-gray-700 rounded';
    close.textContent = 'Close';
    close.addEventListener('click', () => {
      panel.remove();
      this.panelEl = null;
    });
    buttons.appendChild(close);
    if (this.onSoundCheck) {
      const soundCheck = document.createElement('button');
      soundCheck.type = 'button';
      soundCheck.className = 'px-2 py-1 bg-gray-700 rounded';
      soundCheck.textContent = 'Sound check';
      soundCheck.setAttribute('aria-label', 'Play test sound');
      soundCheck.addEventListener('click', () => {
        void this.onSoundCheck?.();
      });
      buttons.appendChild(soundCheck);
    }
    if (this.onSimulateGuess) {
      const sim = document.createElement('button');
      sim.type = 'button';
      sim.className = 'px-2 py-1 bg-gray-700 rounded';
      sim.textContent = 'Simulate guess';
      sim.setAttribute('aria-label', 'Advance card as if you said the answer');
      sim.addEventListener('click', () => {
        this.onSimulateGuess?.();
      });
      buttons.appendChild(sim);
    }
    panel.appendChild(buttons);
    this.container.appendChild(panel);
    this.panelEl = panel;
  }

  update(): void {
    if (this.panelEl && this.getData) {
      const data = this.getData();
      const pre = this.panelEl.querySelector('pre');
      if (pre) {
        pre.textContent = JSON.stringify({
          currentCard: data.currentCard,
          lastTranscriptRaw: data.lastTranscriptRaw,
          lastTranscriptResolved: data.lastTranscriptResolved,
          hapticsSupported: data.hapticsSupported,
          audioUnlocked: data.audioUnlocked,
          fps: data.fps.toFixed(1),
          sessionState: data.sessionState,
        }, null, 2);
      }
    }
  }

  dispose(): void {
    if (this.longPressTimer) clearTimeout(this.longPressTimer);
    this.longPressTimer = null;
    window.removeEventListener('keydown', this.keyHandler!);
    this.keyHandler = null;
    this.panelEl?.remove();
    this.panelEl = null;
    this.container?.querySelector('button[aria-label="Open debug panel"]')?.remove();
    this.container = null;
    this.getData = null;
  }
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
