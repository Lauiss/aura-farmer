import { Component, computed, Pipe, PipeTransform, signal, forwardRef, ViewChild, ElementRef,  inject } from '@angular/core';
import { AuraManager } from '../../services/aura-manager';
import { ItemSave, ShopManager } from '../../services/shop-manager';
import { interval } from 'rxjs';
import { AuraBtn } from "../../components/aura-btn/aura-btn";
import { ShopList } from "../../components/shop-list/shop-list";
import { SaveData, SaveManager } from '../../services/save-manager';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Sound, SoundManager } from '../../services/sound-manager';
import { OfflineProgressAnnouncer } from '../../components/offline-progress-announcer/offline-progress-announcer';
import { ModalManager } from '../../services/modal-manager';
import { Settings } from '../../components/settings/settings';
import { SettingsManager } from '../../services/settings-manager';
import { AchievementsManager } from '../../services/achievements-manager';
import { createAchievements } from '../../../assets/static/achievements';

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  imports: [AuraBtn, ShopList, TranslatePipe, forwardRef(() => FormatAuraPipe)]
})
export class GamePage {

  saveLocation = "AURA_FARMER_SAVE";
  @ViewChild('btn', { read: ElementRef, static: true })
  private btnRef!: ElementRef<HTMLElement>;

  public readonly soundManager = inject(SoundManager);
  public readonly translate = inject(TranslateService);
  public readonly auraManager = inject(AuraManager);
  public readonly shopManager = inject(ShopManager);
  public readonly saveManager = inject(SaveManager);
  public readonly modalManager = inject(ModalManager);
  public readonly settingsManager = inject(SettingsManager);
  public readonly achievementsManager = inject(AchievementsManager);


  ngOnInit() {
    this.settingsManager.getSettingsConfig();

    // Initialiser les achievements
    const achievements = createAchievements(
      () => this.shopManager.getAllItems(),
      () => this.achievementsManager.totalClicks(),
      () => this.auraManager.allTimeAura()
    );
    this.achievementsManager.setAchievements(achievements);

    this.loadSave();

    // Vérifier rétroactivement les achievements (sans notification)
    this.achievementsManager.checkAchievementsSilently();

    this.startAuraGain();
    this.soundManager.changeMusic(Sound.Game);
  }

  protected increment(e?: MouseEvent) {
    const before = this.auraManager.auraCount();
    this.auraManager.increment();
    const after = this.auraManager.auraCount();

    // Incrémenter le compteur de clics
    this.achievementsManager.incrementClicks();

    const delta = +(after - before).toFixed(2);
    if (e && delta !== 0) {
      this.jellyButton(e);
      this.spawnFloatingDelta(e.clientX, e.clientY, delta);
    }

    this.soundManager.playFX(Sound.Plop);
  }

  startAuraGain() {
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

  createSave() {
    const plainItems: ItemSave[] = this.shopManager.getAllItems().map(item => ({
      id: item.id,
      value: item.value(),
      quantity: item.level(),
      price: item.price(),
      factor: item.factor,
      upgrades: item.upgrades?.map(u => ({ id: u.id, unlocked: u.unlocked })),
      unlocked: item.unlocked
    }));

    const moyaiUpgrades = this.shopManager.moyaiUpgrades().map(upgrade => ({
      id: upgrade.id,
      unlocked: upgrade.unlocked
    }));

    const saveData: SaveData = {
      auraCount: parseInt(this.auraManager.auraCount().toFixed(2)),
      allTimeAura: parseInt(this.auraManager.totalAllTime.toFixed(2)),
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

  loadSave(){
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

  // Animation pour les clicks
  private jellyButton(e: MouseEvent) {
    const el = this.btnRef?.nativeElement ?? null;
    if (!el) return;

    // Respecte prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.getAnimations().forEach(a => a.cancel());
      el.animate([{ transform: 'scale(0.98)' }, { transform: 'scale(1)' }], {
        duration: 120, easing: 'linear'
      });
      return;
    }

    // Tilt léger selon le côté cliqué
    const r = el.getBoundingClientRect();
    const relX = (e.clientX - r.left) / r.width;  // 0..1
    const tilt = (relX - 0.5) * 8;               // -4..4 deg

    el.getAnimations().forEach(a => a.cancel());
    el.animate(
      [
        { transform: 'scale(1,1) rotate(0deg)' },
        { transform: `scale(1.12,0.88) rotate(${tilt}deg)`, offset: 0.25 },
        { transform: `scale(0.92,1.08) rotate(${-tilt * 0.6}deg)`, offset: 0.5 },
        { transform: `scale(1.04,0.96) rotate(${tilt * 0.3}deg)`, offset: 0.75 },
        { transform: 'scale(1,1) rotate(0deg)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'none' }
    );
  }

  /** Crée un “+X” flottant à la position du clic (coordonnées écran) */
  private spawnFloatingDelta(clientX: number, clientY: number, delta: number) {
    const span = document.createElement('span');
    // tu peux réutiliser ton pipe si tu veux le même formatage :
    const formatted = new FormatAuraPipe().transform(delta >= 0 ? delta : -delta);
    span.textContent = `${delta >= 0 ? '+' : '-'}${formatted}`;

    // Style inline pour éviter de toucher tes SCSS
    Object.assign(span.style, {
      position: 'fixed',
      left: `${clientX}px`,
      top: `${clientY}px`,
      transform: 'translate(-50%, -50%)',
      fontWeight: '700',
      fontSize: '40px',
      color: 'white',
      textShadow: '0 1px 0 rgba(0,0,0,.4)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      willChange: 'transform, opacity',
    } as CSSStyleDeclaration);

    document.body.appendChild(span);

    // Animation : léger pop, monte et disparaît
    const anim = span.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0 },
        { transform: 'translate(-50%, -70%) scale(1.08)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%, -110%) scale(1)', opacity: 0 }
      ],
      { duration: 700, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );

    anim.onfinish = () => span.remove();
  }
}

  @Pipe({
    name: 'formatAura',
    standalone: true
  })
  export class FormatAuraPipe implements PipeTransform {
  transform(value: number): string {
    const absValue = Math.abs(value);

    if (absValue >= 1e12) {
      return (value / 1e12).toFixed(2).replace(/\.00$/, '') + ' T';
    } else if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2).replace(/\.00$/, '') + ' B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2).replace(/\.00$/, '') + ' M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2).replace(/\.00$/, '') + ' k';
    } else if (absValue >= 1000) {
      return Math.round(value).toString();
    } else if (absValue >= 1) {
      return value.toFixed(2).replace(/\.00$/, '');
    } else {
      return value.toFixed(2);
    }
  }
}
