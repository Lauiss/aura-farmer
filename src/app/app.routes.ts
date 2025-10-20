import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { GamePage } from './pages/game-page/game-page';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'game', component: GamePage }
];
