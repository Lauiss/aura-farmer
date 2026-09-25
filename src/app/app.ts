import { Component, ChangeDetectionStrategy, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalHost } from './components/modal-host/modal-host';
import { AchievementToast } from './components/achievement-toast/achievement-toast';
import { MoyaiHint } from './components/moyai-hint/moyai-hint';
import { SettingsManager } from './services/settings-manager';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalHost, AchievementToast, MoyaiHint],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss'
})
export class App {

  private readonly settings = inject(SettingsManager);

  constructor() {
    // Le mode calme est porté par un attribut sur la racine du document plutôt
    // que par une classe sur chaque composant : la feuille de style globale
    // coupe alors animations et transitions d'un seul endroit, y compris dans
    // les composants qui n'ont aucune raison de connaître ce réglage.
    effect(() => {
      document.documentElement.toggleAttribute('data-calm', this.settings.calm());
    });
  }
}
