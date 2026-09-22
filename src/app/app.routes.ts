import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { GamePage } from './pages/game-page/game-page';
import { ShopMap } from './pages/shop-map/shop-map';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'game', component: GamePage },
	{ path: 'shop', component: ShopMap }
];
