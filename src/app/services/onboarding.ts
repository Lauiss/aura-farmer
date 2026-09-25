import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { BattleManager } from './battle-manager';
import { HintManager } from './hint-manager';
import { SaveLocation, SaveManager } from './save-manager';
import { ModelIcons } from './model-icons';

/** Étapes d'apprentissage, jouées une seule fois chacune. */
export type OnboardingStep = 'intro' | 'battles';

/** Entrées de menu que le mentor présente à leur apparition. */
export type MenuEntry =
  | 'shop'
  | 'wardrobe'
  | 'store'
  | 'casino'
  | 'collection'
  | 'quests'
  | 'achievements';

interface OnboardingSave {
  steps: OnboardingStep[];
  /** Entrées de menu déjà présentées. */
  menus?: MenuEntry[];
}

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

  private readonly modelIcons = inject(ModelIcons);

  private readonly seen = signal<Set<OnboardingStep>>(new Set());
  private readonly presented = signal<Set<MenuEntry>>(new Set());

  /**
   * Étape en cours de mise en lumière, ou `null`. L'écran de jeu s'en sert
   * pour assombrir tout ce qui n'est pas visé.
   */
  readonly spotlight = signal<OnboardingStep | null>(null);

  /** Vrai tant qu'un projecteur est allumé, quel qu'il soit. */
  readonly dimmed = computed(() => this.spotlight() !== null);

  constructor() {
    // Les parties d'avant le mentor enregistraient un simple tableau d'étapes.
    const saved: OnboardingStep[] | OnboardingSave | null =
      this.saveManager.loadProgress(SaveLocation.Onboarding);
    if (Array.isArray(saved)) {
      this.seen.set(new Set(saved));
    } else if (saved) {
      this.seen.set(new Set(saved.steps ?? []));
      this.presented.set(new Set(saved.menus ?? []));
    }

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
      case 'intro': {
        // Trois messages qui s'enchaînent dans la file : d'où l'on part, ce
        // qu'on fait, et où va l'aura gagnée. C'est **John Pork** qui parle —
        // il ramasse le moyai au fond du trou, et c'est là que commence
        // l'histoire.
        const icon = this.modelIcons.caller('john');
        for (const line of ['ONBOARD_INTRO_1', 'ONBOARD_INTRO_2', 'ONBOARD_INTRO_3']) {
          this.hintManager.announce({ titleKey: 'CALLER_JOHN', bodyKey: line, icon }, 5200);
        }
        break;
      }

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
    if (this.auraManager.auraCount().lte(0)) this.play('intro');
  }

  /**
   * **John Pork présente une entrée de menu**, en une ligne, la première fois
   * qu'elle apparaît. C'est lui le mentor de l'histoire : il ramasse le moyai
   * au fond du trou et lui montre où sont les choses. Une entrée déjà
   * présentée ne l'est jamais deux fois.
   */
  presentMenu(entry: MenuEntry): void {
    if (this.presented().has(entry)) return;
    this.presented.update(list => new Set(list).add(entry));
    this.persist();

    this.hintManager.announce({
      titleKey: 'CALLER_JOHN',
      bodyKey: `MENU_INTRO_${entry.toUpperCase()}`,
      icon: this.modelIcons.caller('john')
    });
  }

  /**
   * Marque des entrées comme déjà vues, sans rien dire. Sert au chargement
   * d'une partie avancée : présenter d'un coup les sept onglets d'un joueur de
   * la dixième heure n'apprendrait rien à personne.
   */
  markPresented(entries: readonly MenuEntry[]): void {
    this.presented.update(list => new Set([...list, ...entries]));
    this.persist();
  }

  /** Éteint le projecteur — au clic sur la cible, ou n'importe où ailleurs. */
  dismiss(): void {
    this.spotlight.set(null);
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Onboarding, {
      steps: [...this.seen()],
      menus: [...this.presented()]
    } satisfies OnboardingSave);
  }
}
