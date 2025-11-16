import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { SoundManager } from '../../services/sound-manager';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class Settings {
  protected soundManager = inject(SoundManager);
  protected translate = inject(TranslateService);

  get fxVolume() { return this.soundManager.fxVolume(); }
  set fxVolume(val: number) { this.soundManager.fxVolume.set(val); }

  get musicVolume() { return this.soundManager.ambianceVolume(); }
  set musicVolume(val: number) { this.soundManager.ambianceVolume.set(val); }

  changeLang(lang: string) {
    if (lang){
    this.translate.use(lang);
    }
  }
}
