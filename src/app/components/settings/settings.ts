import { Component, inject, OnInit } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SoundManager } from '../../services/sound-manager';
import { DecimalPipe } from '@angular/common';
import { SaveLocation, SaveManager } from '../../services/save-manager';
import { SettingsConfig, SettingsManager } from '../../services/settings-manager';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})

export class Settings {

  language: string = 'en';

  private settingsManager = inject(SettingsManager);

  settingsConfig: SettingsConfig = {
    fxVolume: 1,
    musicVolume: 1,
    language: 'en'
  };

  constructor() {
    this.settingsConfig = this.settingsManager.getSettingsConfig();
    this.language = this.settingsConfig.language;
  }

  protected soundManager = inject(SoundManager);
  protected translate = inject(TranslateService);
  protected saveManager = inject(SaveManager);

  get fxVolume() { return this.soundManager.fxVolume(); }
  get musicVolume() { return this.soundManager.ambianceVolume(); }

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

  private saveOptionsConfiguration() {
    this.settingsConfig = {
      fxVolume: this.fxVolume,
      musicVolume: this.musicVolume,
      language: this.language
    };

    this.settingsManager.setSettingsConfig(this.settingsConfig);
  }

  private loadConfig() {
    this.settingsConfig = this.settingsManager.getSettingsConfig();
  }
}
