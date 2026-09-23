import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { BattleManager } from './battle-manager';
import { HintManager } from './hint-manager';
import { SaveLocation, SaveManager } from './save-manager';

/** Étapes d'apprentissage, jouées une seule fois chacune. */
export type OnboardingStep = 'intro' | 'battles';

/**
 * Petits temps d'apprentissage : la tête de moyai explique une mécanique au
 * moment exact où le joueur la rencontre, et l'entrée de menu concernée est
 * mise en lumière pendant que le reste s'assombrit.
 *
 * Chaque étape n'est jouée **qu'une fois par partie** et le retient dans la
 * sauvegarde : revenir sur l'écran de jeu ne doit pas relancer l'explication.
 */
@Injectable({
  providedIn: 'root'
})
export class Onboarding {

  private readonly saveManager = inject(SaveManager);
  private readonly hintManager = inject(HintManager);
  private readonly auraManager = inject(AuraManager);
  private readonly battles = inject(BattleManager);

  private readonly seen = signal<Set<OnboardingStep>>(new Set());

  /**
   * Étape en cours de mise en lumière, ou `null`. L'écran de jeu s'en sert
   * pour assombrir tout ce qui n'est pas visé.
   */
  readonly spotlight = signal<OnboardingStep | null>(null);

  /** Vrai tant qu'un projecteur est allumé, quel qu'il soit. */
  readonly dimmed = computed(() => this.spotlight() !== null);

  constructor() {
    const saved: OnboardingStep[] | null = this.saveManager.loadProgress(SaveLocation.Onboarding);
    if (saved) this.seen.set(new Set(saved));

    // Les battles se découvrent en cours de partie : l'explication part au
    // moment précis où l'entrée de menu apparaît.
    effect(() => {
      if (this.battles.discovered()) this.play('battles');
    });
  }

  hasSeen(step: OnboardingStep): boolean {
    return this.seen().has(step);
  }

  /**
   * Joue une étape si elle ne l'a jamais été. Appelé à l'arrivée sur l'écran
   * de jeu pour l'introduction, et par un effet pour les découvertes.
   */
  play(step: OnboardingStep): void {
    if (this.hasSeen(step)) return;
    this.seen.update(seen => new Set(seen).add(step));
    this.persist();

    switch (step) {
      case 'intro':
        // Trois messages qui s'enchaînent dans la file : d'où l'on part, ce
        // qu'on fait, et où va l'aura gagnée.
        this.hintManager.show('ONBOARD_INTRO_1', 5200);
        this.hintManager.show('ONBOARD_INTRO_2', 5200);
        this.hintManager.show('ONBOARD_INTRO_3', 5200);
        break;

      case 'battles':
        this.hintManager.show('ONBOARD_BATTLES', 6000);
        this.spotlight.set('battles');
        break;
    }
  }

  /**
   * L'introduction ne se justifie qu'au tout début, quand le compteur est
   * encore dans le négatif. Rejoindre une partie avancée ne doit pas
   * réexpliquer le clic.
   */
  playIntroIfFresh(): void {
    if (this.auraManager.auraCount() <= 0) this.play('intro');
  }

  /** Éteint le projecteur — au clic sur la cible, ou n'importe où ailleurs. */
  dismiss(): void {
    this.spotlight.set(null);
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Onboarding, [...this.seen()]);
  }
}
