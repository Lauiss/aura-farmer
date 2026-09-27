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
import { CinematicManager } from '../../services/cinematic-manager';
import { SaveLocation, SaveManager } from '../../services/save-manager';

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
  private readonly cinematics = inject(CinematicManager);
  private readonly saveManager = inject(SaveManager);

  ngOnInit() {
    this.settingsManager.getSettingsConfig();
    this.soundManager.changeMusic(Sound.Menu);
  }

  startGame() {
    this.soundManager.playFX(Sound.Plop);

    // L'introduction ne se joue qu'au **tout premier** lancement : la rejouer
    // devant quelqu'un qui reprend sa partie serait une punition, pas une mise
    // en scène.
    //
    // Le repère est l'**existence d'une sauvegarde**, et non l'aura en
    // mémoire : la boucle de jeu ne démarre qu'à l'écran suivant, si bien
    // qu'ici le compteur vaut toujours celui d'une partie neuve et que
    // l'introduction partait pour tout le monde.
    if (!this.saveManager.hasProgress(SaveLocation.GameSave)) this.cinematics.play('intro');

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
