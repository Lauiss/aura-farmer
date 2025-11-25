import { inject, Injectable } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';
import { TranslateService } from '@ngx-translate/core';
import { SoundManager } from './sound-manager';

export interface SettingsConfig {
  fxVolume: number;
  musicVolume: number;
  language: string;
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
    language: 'en'
  };

  settingConfig: SettingsConfig = this.defaultConfig;

  constructor() {
    this.loadSettingsConfig();
  }

  private loadSettingsConfig() {
    this.settingConfig = this.saveManager.loadProgress(SaveLocation.Settings) ?? this.defaultConfig;

    this.soundManager.fxVolume.set(this.settingConfig?.fxVolume ?? 1);
    this.soundManager.updateAmbianceVolume(this.settingConfig?.musicVolume ?? 1);
    this.translate.use(this.settingConfig?.language ?? 'en');
  }

  public getSettingsConfig(): SettingsConfig {
    if(!this.settingConfig) {
      this.loadSettingsConfig();
    }
    return this.settingConfig;
  }

  public setSettingsConfig(config: SettingsConfig) {
    this.settingConfig = config;
    this.saveManager.saveProgress(SaveLocation.Settings, config);
  }

}
