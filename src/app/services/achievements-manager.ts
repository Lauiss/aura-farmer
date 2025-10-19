import { Injectable, WritableSignal } from '@angular/core';

interface Achievement {
  title: string;
  description: string;
  icon?: string;
  condition: WritableSignal<boolean>;
  owned: boolean;
}

@Injectable({
  providedIn: 'root'
})

export class AchievementsManager {

}
