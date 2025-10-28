import { Component, computed, Pipe, PipeTransform, signal, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { inject } from '@angular/core/primitives/di';
import { AuraManager } from '../../services/aura-manager';
import { ItemSave, ShopManager } from '../../services/shop-manager';
import { interval } from 'rxjs';
import { AuraBtn } from "../../components/aura-btn/aura-btn";
import { ShopList } from "../../components/shop-list/shop-list";
import { SaveData, SaveManager } from '../../services/save-manager';

@Component({
  standalone: true,
  selector: 'app-game-page',
  templateUrl: './game-page.html',
  styleUrls: ['./game-page.scss'],
  imports: [AuraBtn, ShopList, forwardRef(() => FormatAuraPipe)]
})
export class GamePage {

  saveLocation = "AURA_FARMER_SAVE";
  @ViewChild('btn', { read: ElementRef, static: true })
  private btnRef!: ElementRef<HTMLElement>;

  constructor(
    protected readonly auraManager: AuraManager,
    protected readonly shopManager: ShopManager,
    protected readonly saveManager: SaveManager
  ) {}

  ngOnInit() {
    this.loadSave();
    this.startAuraGain();
  }

  protected increment(e?: MouseEvent) {
    const before = this.auraManager.auraCount();
    this.auraManager.increment();               // ta logique existante
    const after = this.auraManager.auraCount();

    const delta = +(after - before).toFixed(2); // gère les upgrades/click power
    if (e && delta !== 0) {
      this.jellyButton(e);                      // petit effet “gelée” sur le bouton
      this.spawnFloatingDelta(e.clientX, e.clientY, delta);
    }
  }

  startAuraGain() {
    interval(100).subscribe(() => {
      if(this.shopManager.getTotalValue() > 0){
        this.auraManager.auraCount.update(current => current + this.shopManager.getTotalValue());
        this.auraManager.allTimeAura.update(total => total + this.shopManager.getTotalValue());
      }
      this.createSave();
    });
  }

  createSave() {
    const plainItems: ItemSave[] = this.shopManager.getAllItems().map(item => ({
      id: item.id,
      value: item.value(),
      quantity: item.quantity(),
      price: item.price(),
      factor: item.factor,
      unlocked: item.unlocked
    }));

    const saveData: SaveData = {
      auraCount: parseInt(this.auraManager.auraCount().toFixed(2)),
      allTimeAura: parseInt(this.auraManager.totalAllTime.toFixed(2)),
      shopItems: plainItems
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
      this.shopManager.restoreFromSave(saveData.shopItems);
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
