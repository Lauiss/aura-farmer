import { Component, inject, ChangeDetectionStrategy, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SoundManager } from '../../services/sound-manager';
import { DecimalPipe } from '@angular/common';
import { SaveManager } from '../../services/save-manager';
import { FPS_CAPS, GraphicsQuality, SettingsConfig, SettingsManager } from '../../services/settings-manager';
import { ModalManager } from '../../services/modal-manager';
import { GameLoop } from '../../services/game-loop';
import { SaveTransfer } from '../../services/save-transfer';

/** Où en est l'échange de sauvegarde, pour le message affiché sous les boutons. */
type TransferState =
  | { step: 'idle' }
  | { step: 'exported'; copied: boolean }
  | { step: 'confirm'; payload: Record<string, string> }
  | { step: 'error'; key: string };

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './settings.scss'
})

export class Settings {

  language: string = 'en';

  private settingsManager = inject(SettingsManager);
  private readonly router = inject(Router);
  private readonly modalManager = inject(ModalManager);
  private readonly gameLoop = inject(GameLoop);
  private readonly saveTransfer = inject(SaveTransfer);

  readonly fpsCaps = FPS_CAPS;

  settingsConfig: SettingsConfig = {
    fxVolume: 1,
    musicVolume: 1,
    language: 'en'
  };

  /** Le retour au menu n'a pas de sens depuis le menu lui-même. */
  readonly inGame = this.router.url.split('?')[0] !== '/';

  readonly transfer = signal<TransferState>({ step: 'idle' });
  /** Code collé à la main, à défaut de fichier. */
  readonly pasted = signal('');
  readonly busy = signal(false);

  readonly transferCopied = computed(() => {
    const state = this.transfer();
    return state.step === 'exported' && state.copied;
  });

  readonly transferError = computed(() => {
    const state = this.transfer();
    return state.step === 'error' ? state.key : '';
  });

  constructor() {
    this.settingsConfig = this.settingsManager.getSettingsConfig();
    this.language = this.settingsConfig.language;
  }

  protected soundManager = inject(SoundManager);
  protected translate = inject(TranslateService);
  protected saveManager = inject(SaveManager);

  get fxVolume() { return this.soundManager.fxVolume(); }
  get musicVolume() { return this.soundManager.ambianceVolume(); }
  get graphics() { return this.settingsManager.graphics(); }
  get fpsCap() { return this.settingsManager.fpsCap(); }
  get calm() { return this.settingsManager.calm(); }

  onCalmChange(event: Event) {
    this.saveOptionsConfiguration({ calm: (event.target as HTMLInputElement).checked });
  }

  onFxVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.soundManager.fxVolume.set(value);
    this.saveOptionsConfiguration();
  }

  onMusicVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.soundManager.updateAmbianceVolume(value);
    this.saveOptionsConfiguration();
  }

  onLanguageChange(event: Event) {
    const lang = (event.target as HTMLSelectElement).value;
    this.language = lang;
    this.translate.use(lang);
    this.saveOptionsConfiguration();
  }

  onGraphicsChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as GraphicsQuality;
    this.saveOptionsConfiguration({ graphics: value });
  }

  onFpsCapChange(event: Event) {
    const value = Number((event.target as HTMLSelectElement).value);
    this.saveOptionsConfiguration({ fpsCap: value });
  }

  /**
   * Sauvegarde la partie avant de partir : le retour au menu ne doit rien
   * coûter, même juste après un achat.
   */
  backToMenu() {
    this.gameLoop.saveIfStarted();
    this.modalManager.closeAll();
    this.router.navigate(['/']);
  }

  /**
   * Exporte la partie : le code est téléchargé en fichier et copié dans le
   * presse-papiers, pour qu'on puisse le coller sans chercher le fichier.
   */
  async exportSave() {
    this.busy.set(true);
    try {
      // Sans ça, le code pouvait dater de la dernière sauvegarde automatique,
      // jusqu'à dix secondes plus tôt.
      this.gameLoop.saveIfStarted();
      const code = await this.saveTransfer.exportCode();

      const blob = new Blob([code], { type: 'text/plain' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `aura-farmer-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      URL.revokeObjectURL(link.href);

      let copied = false;
      try {
        await navigator.clipboard.writeText(code);
        copied = true;
      } catch {
        // Presse-papiers refusé (contexte non sécurisé, iframe) : le fichier suffit.
      }
      this.transfer.set({ step: 'exported', copied });
    } catch (error) {
      console.error('Export de la sauvegarde :', error);
      this.transfer.set({ step: 'error', key: 'SAVE_EXPORT_FAILED' });
    } finally {
      this.busy.set(false);
    }
  }

  async importFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    await this.decode(await file.text());
  }

  async importPasted() {
    await this.decode(this.pasted());
  }

  onPaste(event: Event) {
    this.pasted.set((event.target as HTMLTextAreaElement).value);
  }

  /** Déchiffre puis demande confirmation : rien n'est écrasé avant. */
  private async decode(code: string) {
    if (!code.trim()) return;
    this.busy.set(true);
    try {
      const result = await this.saveTransfer.decode(code);
      if (typeof result === 'string') {
        this.transfer.set({
          step: 'error',
          key: result === 'format' ? 'SAVE_IMPORT_FORMAT' : 'SAVE_IMPORT_CORRUPTED'
        });
      } else {
        this.transfer.set({ step: 'confirm', payload: result });
      }
    } finally {
      this.busy.set(false);
    }
  }

  confirmImport() {
    const state = this.transfer();
    if (state.step !== 'confirm') return;
    this.saveTransfer.apply(state.payload);
  }

  cancelImport() {
    this.transfer.set({ step: 'idle' });
  }

  private saveOptionsConfiguration(changes: Partial<SettingsConfig> = {}) {
    this.settingsConfig = {
      fxVolume: this.fxVolume,
      musicVolume: this.musicVolume,
      language: this.language,
      graphics: this.graphics,
      fpsCap: this.fpsCap,
      calm: this.calm,
      ...changes
    };

    this.settingsManager.setSettingsConfig(this.settingsConfig);
  }
}
