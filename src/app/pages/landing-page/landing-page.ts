import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActionBtn } from '../../components/action-btn/action-btn';
import { Sound, SoundManager } from '../../services/sound-manager';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Settings } from '../../components/settings/settings';
import { Credits } from '../../components/credits/credits';
import { SettingsManager } from '../../services/settings-manager';
import { ModalManager } from '../../services/modal-manager';
import { MoyaiViewer } from '../../components/moyai-viewer/moyai-viewer';

@Component({
  standalone: true,
  selector: 'app-landing-page',
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.scss'],
  imports: [ActionBtn, TranslatePipe, MoyaiViewer],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit {

  public readonly soundManager = inject(SoundManager);
  private readonly router = inject(Router);
  public readonly translate = inject(TranslateService);
  public readonly settingsManager = inject(SettingsManager);
  private readonly modalManager = inject(ModalManager);

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
    this.modalManager.open(Settings);
  }

  openCredits() {
    this.soundManager.playFX(Sound.Plop);
    this.modalManager.open(Credits);
  }
}
