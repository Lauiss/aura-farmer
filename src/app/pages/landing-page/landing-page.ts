import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ActionBtn } from "../../components/action-btn/action-btn";
import { Sound, SoundManager } from '../../services/sound-manager';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Settings } from '../../components/settings/settings';
import { SettingsManager } from '../../services/settings-manager';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss'],
  imports: [ActionBtn, TranslatePipe]
})
export class LandingPage {

  public readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  public readonly translate = inject(TranslateService);
  public readonly settingsManager = inject(SettingsManager);

  ngOnInit() {
    this.settingsManager.getSettingsConfig();
    this.soundManager.changeMusic(Sound.Menu);
  }

  startGame() {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  openSettings() {
    this.soundManager.playFX(Sound.Plop);
  }
}
