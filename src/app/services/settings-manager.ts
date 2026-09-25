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
  calm?: boolean;
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
    fpsCap: 0,
    calm: false
  };

  settingConfig: SettingsConfig = this.defaultConfig;

  /**
   * Réglages de rendu, en signaux : les scènes Three.js les lisent image par
   * image et s'y adaptent sans être remontées.
   */
  readonly graphics = signal<GraphicsQuality>('high');
  readonly fpsCap = signal(0);

  /**
   * Mode calme : le jeu se joue à l'identique mais cesse de clignoter. Traînées
   * de vitesse, éclats d'aura, à-coups de boutons, ampoules du casino et
   * défilement du fil s'éteignent ; ce qui porte une information — les montants
   * qui s'affichent, les couleurs de publication — reste.
   *
   * Ce n'est pas le mode économie : celui-ci allège le **rendu** (pixels,
   * contextes WebGL) sans rien retirer au spectacle. On peut vouloir l'un sans
   * l'autre.
   */
  readonly calm = signal(false);

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
    this.calm.set(this.settingConfig?.calm ?? false);
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
    this.calm.set(config.calm ?? false);
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

  /**
   * Portillon d'images d'une scène : c'est lui qui décide si l'image courante
   * doit être peinte sous le plafond choisi.
   */
  gate(own: () => number = () => 0): FrameGate {
    return new FrameGate(this, own);
  }
}

/**
 * Compte le temps écoulé entre deux peintures et laisse passer une image quand
 * l'intervalle demandé est atteint. Le temps continue de s'écouler pour les
 * images sautées : les animations se fondent sur `delta` et restent justes.
 */
export class FrameGate {

  private since = 0;

  constructor(
    private readonly settings: SettingsManager,
    private readonly own: () => number
  ) {}

  allows(delta: number): boolean {
    const fps = this.settings.frameCap(this.own());
    if (fps <= 0) return true;

    const interval = 1 / fps;
    this.since += delta;

    // Tolérance d'un cinquième d'intervalle. Plafonner à 60 sur un écran de
    // 60 Hz laisse tout juste un intervalle entre deux images : la moindre
    // gigue passait sous la barre, une image sur deux était sautée et le
    // plafond de 60 rendait 30 images par seconde. C'est ce qui donnait
    // l'impression que le réglage n'était pas pris en compte.
    if (this.since < interval * 0.8) return false;

    // On retranche l'intervalle plutôt que de remettre à zéro : jeter le
    // dépassement ferait dériver la cadence sous le plafond demandé.
    this.since = Math.max(-interval, Math.min(this.since - interval, interval));
    return true;
  }
}
