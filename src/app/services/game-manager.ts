import { Injectable, Signal, WritableSignal } from '@angular/core';

export interface Success {
  id: number;
  name: WritableSignal<string>;
  description: WritableSignal<string>;
  condition: Signal<boolean>;
  unlocked: boolean;
}

export interface Upgrade {
  id: number;
  itemId?: number;
  name: WritableSignal<string>;
  description: WritableSignal<string>;
  condition: Signal<boolean>;
  effect: WritableSignal<boolean>;
  unlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GameManager {

  applyItemUpgrade(upgrade: Upgrade): void {}

  applyMoyaiUpgrade(upgradeId: number): void {}
}
