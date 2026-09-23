import { Injectable, inject } from '@angular/core';
import { interval } from 'rxjs';
import { AuraManager } from './aura-manager';
import { ItemSave, ShopManager } from './shop-manager';
import { SaveData, SaveManager } from './save-manager';
import { AchievementsManager } from './achievements-manager';
import { ModalManager } from './modal-manager';
import { OfflineProgressAnnouncer } from '../components/offline-progress-announcer/offline-progress-announcer';
import { createAchievements } from '../../assets/static/achievements';
import { StyleBonus } from './style-bonus';
import { SecretTracker } from './secret-tracker';

/**
 * Boucle de jeu : production d'aura passive, vérification des succès et
 * sauvegarde automatique.
 *
 * Elle vit dans un service et non dans la page de jeu. Deux raisons : la
 * production doit continuer pendant qu'on parcourt la carte de la boutique, et
 * une boucle attachée à une page se rabonnerait à chaque retour, multipliant
 * les gains d'un aller-retour à l'autre.
 */
@Injectable({
  providedIn: 'root'
})
export class GameLoop {

  readonly saveLocation = 'AURA_FARMER_SAVE';

  private readonly auraManager = inject(AuraManager);
  private readonly shopManager = inject(ShopManager);
  private readonly saveManager = inject(SaveManager);
  private readonly achievementsManager = inject(AchievementsManager);
  private readonly modalManager = inject(ModalManager);
  private readonly styleBonus = inject(StyleBonus);
  private readonly secretTracker = inject(SecretTracker);

  private started = false;

  /**
   * Déclare les succès, charge la sauvegarde puis démarre la boucle. Sans
   * effet si elle tourne déjà.
   *
   * L'appel vient de l'application et non d'une page : ouvrir directement la
   * carte de la boutique laissait sinon la partie non chargée, avec le compte
   * d'aura à sa valeur initiale.
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    this.achievementsManager.setAchievements(
      createAchievements(
        () => this.shopManager.getAllItems(),
        () => this.achievementsManager.totalClicks(),
        () => this.auraManager.allTimeAura(),
        () => this.shopManager.moyaiUpgrades(),
        () => this.shopManager.maxedSkillCount(),
        () => this.secretTracker.backFacingReached()
      )
    );

    // L'apparence influe sur la production : le lien doit être établi avant
    // que la boucle ne commence à créditer de l'aura.
    this.styleBonus.start();

    this.loadSave();
    // Rattrape les succès déjà remplis, sans notification.
    this.achievementsManager.checkAchievementsSilently();
    this.startAuraGain();
  }

  private startAuraGain() {
    interval(1000).subscribe(() => {
      if(this.shopManager.getTotalValue() > 0){
        this.auraManager.auraCount.update(current => current + this.shopManager.getTotalValue());
        this.auraManager.allTimeAura.update(total => total + this.shopManager.getTotalValue());
      }
      // Vérifier les achievements toutes les secondes
      this.achievementsManager.checkAchievements();
    });

    interval(10000).subscribe(() => {
        this.createSave();
    })
  }

  createSave(): void {
    const plainItems: ItemSave[] = this.shopManager.getAllItems().map(item => ({
      id: item.id,
      value: item.value(),
      quantity: item.level(),
      price: item.price(),
      factor: item.factor,
      upgrades: item.upgrades?.map(u => ({ id: u.id, unlocked: u.unlocked, purchases: u.purchases ?? 0 })),
      unlocked: item.unlocked
    }));

    const moyaiUpgrades = this.shopManager.moyaiUpgrades().map(upgrade => ({
      id: upgrade.id,
      unlocked: upgrade.unlocked,
      upgrades: upgrade.upgrades?.map(u => ({
        id: u.id,
        unlocked: u.unlocked,
        purchases: u.purchases ?? 0
      }))
    }));

    const saveData: SaveData = {
      // `parseInt(x.toFixed(2))` ramenait 4e22 à 4 : au-delà de 1e21,
      // `toFixed` passe en notation exponentielle et `parseInt` s'arrête au
      // point.
      auraCount: Math.floor(this.auraManager.auraCount()),
      allTimeAura: Math.floor(this.auraManager.totalAllTime),
      shopItems: plainItems,
      moyaiUpgrades: moyaiUpgrades,
      counters: this.shopManager.getCountersValue(),
      achievements: this.achievementsManager.getAchievementsForSave(),
      totalClicks: this.achievementsManager.totalClicks()
    }

    if (moyaiUpgrades[0].unlocked){
      saveData.lastSaveTime = Date.now();
    }

    this.saveManager.saveProgress(this.saveLocation,saveData);
  }

  private loadSave(): void {
    const saveData = this.saveManager.loadProgress(this.saveLocation);
    if(!saveData){ return}

    if (saveData.auraCount) {
      this.auraManager.auraCount.set(saveData.auraCount);
    }

    if (saveData.allTimeAura) {
      this.auraManager.defineAllTimeAura(saveData.allTimeAura);
    }

    if (saveData.shopItems) {
      this.shopManager.restoreItemsFromSave(saveData.shopItems);
    }

    if (saveData.moyaiUpgrades) {
      this.shopManager.restoreMoyaiUpgradesFromSave(saveData.moyaiUpgrades);
    }

    if (saveData.counters) {
      this.shopManager.restoreCountersFromSave(saveData.counters);
    }

    if (saveData.achievements) {
      this.achievementsManager.restoreFromSave(saveData.achievements);
    }

    if (saveData.totalClicks) {
      this.achievementsManager.totalClicks.set(saveData.totalClicks);
    }

    if (saveData.lastSaveTime) {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - saveData.lastSaveTime) / 1000);

      if (elapsedSeconds < 60) {
        return;
      }

      const maxOfflineSeconds = 8 * 60 * 60; // 8 heures
      const offlineSeconds = Math.min(elapsedSeconds, maxOfflineSeconds);

      const totalValue = this.shopManager.getTotalValue();
      if (totalValue > 0 && offlineSeconds > 0) {
        const offlineGain = totalValue * offlineSeconds;
        this.auraManager.auraCount.update(current => current + offlineGain);
        this.auraManager.allTimeAura.update(total => total + offlineGain);
        this.modalManager.open(OfflineProgressAnnouncer, {
          data: {
            offlineProgression: offlineGain,
            offlineTime: offlineSeconds
          }
        });
      }
    }
  }
}
