import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { QuestManager, QuestProgress } from '../../services/quest-manager';
import { ModelIcons } from '../../services/model-icons';
import { formatAura } from '../../pipes/format-aura';
import { STORY } from '../../../assets/static/quests';

/**
 * Journal des quêtes : le chapitre en cours de l'histoire, et les trois
 * quotidiennes.
 *
 * Un seul chapitre est montré à la fois, celui qu'on joue. Dérouler toute la
 * suite dévoilerait la fin de l'histoire dès la première minute, et noierait
 * l'étape en cours — qui est précisément la seule information qu'on vient
 * chercher ici.
 */
@Component({
  selector: 'app-quest-log',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './quest-log.html',
  styleUrl: './quest-log.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuestLog {

  readonly quests = inject(QuestManager);
  private readonly modelIcons = inject(ModelIcons);

  readonly scrollIcon = this.modelIcons.moyai();
  readonly total = STORY.length;

  readonly chapterNumber = computed(() => Math.min(this.quests.chapter() + 1, this.total));

  /** Clé de traduction d'une quête, tirée de son identifiant. */
  key(quest: QuestProgress, suffix = ''): string {
    return `QUEST_${quest.definition.id.toUpperCase().replace(/-/g, '_')}${suffix}`;
  }

  /** Part accomplie, en pourcentage, bornée à 100. */
  percent(quest: QuestProgress): number {
    if (quest.target <= 0) return 100;
    return Math.min(100, Math.floor((quest.current / quest.target) * 100));
  }

  /**
   * Avancement chiffré. Les grandeurs qui se comptent en aura passent par
   * l'abréviation : « 1.23 M / 100 M » se lit, pas quinze chiffres.
   */
  count(quest: QuestProgress): string {
    const big = quest.definition.goal === 'aura' || quest.definition.goal === 'production';
    const show = (value: number) =>
      big ? formatAura(value) : quest.definition.goal === 'combo' ? value.toFixed(1) : `${Math.floor(value)}`;
    return `${show(Math.min(quest.current, quest.target))} / ${show(quest.target)}`;
  }
}
