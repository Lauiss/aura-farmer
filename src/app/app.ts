import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalHost } from './components/modal-host/modal-host';
import { AchievementToast } from './components/achievement-toast/achievement-toast';
import { MoyaiHint } from './components/moyai-hint/moyai-hint';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalHost, AchievementToast, MoyaiHint],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss'
})
export class App {

}
