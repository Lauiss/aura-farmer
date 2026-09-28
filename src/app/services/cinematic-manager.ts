import { Injectable, computed, inject, signal } from '@angular/core';
import { SaveLocation, SaveManager } from './save-manager';
import { AuraManager } from './aura-manager';
import { BattleManager } from './battle-manager';
import { BOSSES, BossId } from '../../assets/static/bosses';
import {
  CinematicDefinition,
  Ending,
  LETTER_SEAL,
  Shot,
  cinematic,
  victoryScene
} from '../../assets/static/cinematics';

/**
 * Les cinématiques : quelles scènes ont été vues, et où en est celle qui joue.
 *
 * Le service ne rend rien — il tient le déroulé et le temps. C'est
 * [`CinematicPlayer`](../components/cinematic-player/cinematic-player.ts) qui
 * le met à l'écran. Cette séparation permet de sauter une scène, de la rejouer
 * ou d'en écrire une nouvelle sans toucher au rendu.
 *
 * Une scène n'est jouée **qu'une fois par partie** et retenue dans la
 * sauvegarde : revoir la défaite initiale à chaque lancement serait une
 * punition, pas une mise en scène.
 */
/**
 * Les scènes de victoire portent l'identifiant du boss. Renommer un boss sans
 * renommer sa scène la rendrait à nouveau éligible, et la cinématique se
 * rejouerait à qui l'avait déjà vue — le travers que `catchUp` existe
 * précisément pour empêcher.
 */
function renameScene(id: string): string {
  return id === 'victory-piccolo' ? 'victory-verdolino' : id;
}

@Injectable({
  providedIn: 'root'
})
export class CinematicManager {

  private readonly saveManager = inject(SaveManager);
  private readonly auraManager = inject(AuraManager);
  private readonly battles = inject(BattleManager);

  private readonly seen = signal<Set<string>>(new Set());

  /** Ce qu'on a fait de la lettre. `null` tant que la question ne s'est pas posée. */
  readonly ending = signal<Ending | null>(null);

  /** Scène en cours, `null` quand rien ne joue. */
  readonly playing = signal<CinematicDefinition | null>(null);
  /** Rang du plan affiché. */
  readonly shotIndex = signal(0);

  readonly shot = computed<Shot | null>(() => this.playing()?.shots[this.shotIndex()] ?? null);

  /** Vrai sur le dernier plan : le bouton passe de « passer » à « continuer ». */
  readonly isLast = computed(() => {
    const scene = this.playing();
    return !!scene && this.shotIndex() >= scene.shots.length - 1;
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Les premières parties n'enregistraient qu'un tableau de scènes vues.
    const saved: string[] | { seen: string[]; ending?: Ending } | null =
      this.saveManager.loadProgress(SaveLocation.Cinematics);
    if (Array.isArray(saved)) {
      this.seen.set(new Set(saved.map(renameScene)));
    } else if (saved) {
      this.seen.set(new Set((saved.seen ?? []).map(renameScene)));
      this.ending.set(saved.ending ?? null);
    }
  }

  hasSeen(id: string): boolean {
    return this.seen().has(id);
  }

  /**
   * Joue une scène si elle ne l'a jamais été.
   *
   * Le mode calme ne l'empêche **pas** : une cinématique raconte l'histoire,
   * elle n'est pas un effet décoratif, et la sauter priverait le joueur de ce
   * qui donne son sens à la partie. Ce sont ses mouvements qui se taisent —
   * la feuille de style globale coupe les animations, et les plans s'y
   * enchaînent en poses fixes (voir `cinematic-player.scss`).
   */
  play(id: string): boolean {
    if (this.hasSeen(id)) return false;

    const scene = cinematic(id);
    if (!scene) return false;
    return this.playScene(scene);
  }

  /** Lance une scène déjà construite — celles bâties à la demande passent ici. */
  private playScene(scene: CinematicDefinition): boolean {
    if (this.hasSeen(scene.id)) return false;

    this.seen.update(list => new Set(list).add(scene.id));
    this.persist();
    this.playing.set(scene);
    this.shotIndex.set(0);
    this.schedule();
    return true;
  }

  /** Passe au plan suivant, ou termine la scène. */
  next(): void {
    const scene = this.playing();
    if (!scene) return;
    // On ne passe pas par-dessus une question : y répondre est le seul moyen
    // d'avancer.
    if (this.shot()?.choice) return;

    if (this.shotIndex() >= scene.shots.length - 1) {
      this.stop();
      return;
    }
    this.shotIndex.update(rank => rank + 1);
    this.schedule();
  }

  /**
   * Marque en silence tout ce que la partie a déjà dépassé. Appelée une fois,
   * après le chargement.
   *
   * Sans elle, une partie créée avant les cinématiques n'a aucune scène
   * enregistrée : l'introduction, la fin et les vingt victoires redeviennent
   * toutes éligibles d'un coup. Le principe est le même que pour les succès
   * et les chapitres de quête — ce qui a été franchi avant que la mise en
   * scène n'existe ne se rejoue pas.
   *
   * La **lettre** fait exception et reste jouable : c'est le seul contenu
   * réellement nouveau pour qui avait déjà fini, et son déclenchement est
   * précis. La taire reviendrait à ne jamais la montrer à ces parties-là.
   */
  catchUp(): void {
    const already = new Set(this.seen());
    if (this.auraManager.allTimeAura().gt(0)) already.add('intro');

    for (const boss of BOSSES) {
      if (!this.battles.isDefeated(boss.id)) continue;
      already.add(boss.id === 'chad' ? 'finale' : `victory-${boss.id}`);
    }

    this.seen.set(already);
    this.persist();
  }

  /**
   * La scène de victoire d'un boss, à sa **première** défaite. Chad a droit à
   * la sienne, qui n'est pas une félicitation mais une révélation.
   */
  playVictory(boss: BossId): void {
    if (boss === 'chad') {
      this.play('finale');
      return;
    }
    this.playScene(victoryScene(boss));
  }

  /**
   * La lettre du père se lit quand deux conditions tiennent : Chad battu, et
   * assez d'aura pour en briser le sceau. Appelée par la boucle de jeu, elle
   * ne fait rien tant que ce n'est pas le cas.
   */
  checkStory(): void {
    if (this.playing()) return;
    if (this.hasSeen('letter')) return;
    if (!this.battles.isDefeated('chad')) return;
    if (this.auraManager.auraCount().lt(LETTER_SEAL)) return;
    this.play('letter');
  }

  /** L'écran de fin a-t-il déjà été montré ? Il est retenu comme une scène. */
  private static readonly ENDING_SCREEN = 'thanks';

  /**
   * La partie est-elle finie, et l'écran de fin reste-t-il à montrer ?
   *
   * Les deux fins ne se terminent pas au même moment, et c'est tout leur
   * intérêt : **garder** la lettre clôt l'histoire sur-le-champ, tandis que la
   * **brûler** ouvre un dernier adversaire. Montrer le générique à qui vient
   * d'appeler son père en duel serait lui annoncer la fin avant le combat.
   */
  shouldThank(): boolean {
    if (this.playing()) return false;
    if (this.hasSeen(CinematicManager.ENDING_SCREEN)) return false;

    const ending = this.ending();
    if (!ending) return false;
    if (ending === 'keep') return this.hasSeen('ending-keep');
    return this.battles.isDefeated('father');
  }

  /** Marque l'écran de fin comme vu : il ne se rouvre pas de lui-même. */
  markThanked(): void {
    this.seen.update(list => new Set(list).add(CinematicManager.ENDING_SCREEN));
    this.persist();
  }

  /**
   * Tranche l'embranchement de la lettre. Le choix est **définitif** : c'est
   * ce qui en fait un choix, et le brûler ouvre un adversaire qu'on n'aurait
   * jamais vu autrement.
   */
  choose(option: string): void {
    if (this.ending()) return;
    const ending = option === 'burn' ? 'burn' : 'keep';
    this.ending.set(ending);
    this.persist();

    if (ending === 'burn') this.battles.unlockSecret();
    this.stop();
    this.play(ending === 'burn' ? 'ending-burn' : 'ending-keep');
  }

  /** Interrompt la scène. Elle compte comme vue : on ne la repropose pas. */
  stop(): void {
    clearTimeout(this.timer);
    this.playing.set(null);
    this.shotIndex.set(0);
  }

  /**
   * Le plan s'enchaîne tout seul au bout de sa durée. On peut aussi le presser
   * d'un clic : une cinématique qu'on ne peut pas accélérer se subit.
   */
  private schedule(): void {
    clearTimeout(this.timer);
    const shot = this.shot();
    // Un plan qui pose une question n'a pas de durée : il attend la réponse.
    if (shot && !shot.choice) this.timer = setTimeout(() => this.next(), shot.durationMs);
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Cinematics, {
      seen: [...this.seen()],
      ending: this.ending() ?? undefined
    });
  }
}
