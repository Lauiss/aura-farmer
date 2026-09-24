import { inject, Injectable, signal } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';
import { TranslateService } from '@ngx-translate/core';
import { SoundManager } from './sound-manager';

/**
 * Qualité du rendu 3D. `eco` rend à la densité native de l'écran (et non au
 * double), sans anticrénelage, et remplace les statues décoratives par des
 * images fixes : chacune tenait son propre contexte WebGL, donc sa mémoire.
 */
export type GraphicsQuality = 'high' | 'eco';

/** Plafonds d'images par seconde proposés ; 0 pour suivre l'écran. */
export const FPS_CAPS = [0, 60, 30] as const;

export interface SettingsConfig {
  fxVolume: number;
  musicVolume: number;
  language: string;
  graphics?: GraphicsQuality;
  fpsCap?: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsManager {

  private saveManager = inject(SaveManager);
  private soundManager = inject(SoundManager);
  private translate = inject(TranslateService);

  defaultConfig: SettingsConfig = {
    fxVolume: 1,
    musicVolume: 1,
    language: 'en',
    graphics: 'high',
    fpsCap: 0
  };

  settingConfig: SettingsConfig = this.defaultConfig;

  /**
   * Réglages de rendu, en signaux : les scènes Three.js les lisent image par
   * image et s'y adaptent sans être remontées.
   */
  readonly graphics = signal<GraphicsQuality>('high');
  readonly fpsCap = signal(0);

  constructor() {
    this.loadSettingsConfig();
  }

  private loadSettingsConfig() {
    this.settingConfig = this.saveManager.loadProgress(SaveLocation.Settings) ?? this.defaultConfig;

    this.soundManager.fxVolume.set(this.settingConfig?.fxVolume ?? 1);
    this.soundManager.updateAmbianceVolume(this.settingConfig?.musicVolume ?? 1);
    this.translate.use(this.settingConfig?.language ?? 'en');
    this.graphics.set(this.settingConfig?.graphics === 'eco' ? 'eco' : 'high');
    this.fpsCap.set(this.settingConfig?.fpsCap ?? 0);
  }

  public getSettingsConfig(): SettingsConfig {
    if(!this.settingConfig) {
      this.loadSettingsConfig();
    }
    return this.settingConfig;
  }

  public setSettingsConfig(config: SettingsConfig) {
    this.settingConfig = config;
    this.graphics.set(config.graphics ?? 'high');
    this.fpsCap.set(config.fpsCap ?? 0);
    this.saveManager.saveProgress(SaveLocation.Settings, config);
  }

  /** Vrai en mode économie. */
  isEco(): boolean {
    return this.graphics() === 'eco';
  }

  /**
   * Densité de pixels d'un canevas. En économie, jamais au-delà de 1 : sur un
   * écran 2x, c'est quatre fois moins de pixels à peindre et à garder en
   * mémoire.
   */
  pixelRatio(max: number): number {
    return Math.min(window.devicePixelRatio, this.isEco() ? 1 : max);
  }

  /**
   * Plafond d'images effectif d'une scène : le plus bas de son propre plafond
   * et de celui des options. 0 pour aucun plafond.
   */
  frameCap(own = 0): number {
    const global = this.fpsCap();
    if (!own) return global;
    if (!global) return own;
    return Math.min(own, global);
  }
}
