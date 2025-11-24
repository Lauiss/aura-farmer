import { Component, ElementRef, Signal, ViewChild, WritableSignal } from '@angular/core';
import { moyaiUpgrades } from '../../../assets/static/moyai-upgrades';
import { UpgradeType } from '../../services/shop-manager';

export interface Effect {
  type: UpgradeType;
  value: number;
  targetItemId?: number[];
}

export interface MoyaiUpgrades {
  id: number;
  name: string;
  description: string;
  price: number;
  unlocked: boolean;
  effect: Effect;
  displayCondition: WritableSignal<boolean>;
}

export interface MoyaiUpgradeSave {
  id: number;
  unlocked: boolean;
}

@Component({
  selector: 'app-aura-btn',
  imports: [],
  templateUrl: './aura-btn.html',
  styleUrl: './aura-btn.scss'
})
export class AuraBtn {
  @ViewChild('moyai', { static: true }) moyai!: ElementRef<HTMLImageElement>;
  @ViewChild('box', { static: true }) box!: ElementRef<HTMLDivElement>;
  @ViewChild('moyaiWrap', { static: true }) wrap!: ElementRef<HTMLDivElement>;

  unlocks: MoyaiUpgrades[] = moyaiUpgrades;

  boing(e: MouseEvent) {
    const el = this.wrap.nativeElement;

    const r = el.getBoundingClientRect();
    const relX = (e.clientX - r.left) / r.width;
    const relY = (e.clientY - r.top) / r.height;
    const tilt = (relX - 0.5) * 8;

    // même transform-origin pour tous (le wrapper)
    el.style.transformOrigin = `${(relX*100).toFixed(1)}% ${(relY*100).toFixed(1)}%`;

    // annule si déjà en cours
    el.getAnimations().forEach(a => a.cancel());

    // respects reduced motion
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.animate([{ transform: 'scale(.98)' }, { transform: 'scale(1)' }],
        { duration: 120, easing: 'linear' });
      return;
    }

    el.animate(
      [
        { transform: 'scale(1,1) rotate(0deg)' },
        { transform: `scale(1.12,.88) rotate(${tilt}deg)`, offset: .25 },
        { transform: `scale(.92,1.08) rotate(${-tilt*.6}deg)`, offset: .5 },
        { transform: `scale(1.04,.96) rotate(${tilt*.3}deg)`, offset: .75 },
        { transform: 'scale(1,1) rotate(0deg)' },
      ],
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }
    );
  }
}
