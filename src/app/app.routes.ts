import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { GamePage } from './pages/game-page/game-page';
import { ShopMap } from './pages/shop-map/shop-map';
import { CollectionPage } from './pages/collection-page/collection-page';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'game', component: GamePage },
	{ path: 'shop', component: ShopMap },
	{ path: 'collection', component: CollectionPage },
	// Une adresse inconnue ramène à l'accueil plutôt qu'à un écran vide.
	{ path: '**', redirectTo: '' }
];
