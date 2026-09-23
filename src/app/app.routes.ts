import { Routes } from '@angular/router';
import { LandingPage } from './pages/landing-page/landing-page';
import { GamePage } from './pages/game-page/game-page';
import { ShopMap } from './pages/shop-map/shop-map';
import { CollectionPage } from './pages/collection-page/collection-page';
import { BattlePage } from './pages/battle-page/battle-page';
import { StorePage } from './pages/store-page/store-page';

export const routes: Routes = [
	{ path: '', component: LandingPage },
	{ path: 'game', component: GamePage },
	{ path: 'shop', component: ShopMap },
	{ path: 'collection', component: CollectionPage },
	{ path: 'battle', component: BattlePage },
	{ path: 'store', component: StorePage },
	// Une adresse inconnue ramène à l'accueil plutôt qu'à un écran vide.
	{ path: '**', redirectTo: '' }
];
