import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuraManager } from '../../services/aura-manager';
import { HintManager } from '../../services/hint-manager';
import { Item, ItemUpgrade, ShopManager } from '../../services/shop-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { FormatAuraPipe } from '../game-page/game-page';
import { ModelIcons } from '../../services/model-icons';

type NodeKind = 'root' | 'category' | 'item' | 'upgrade';

export interface MapNode {
  key: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Nœud parent, pour tracer le lien. `null` pour la racine. */
  parent: { x: number; y: number } | null;
  /** Clé de traduction du libellé, pour la racine et les catégories. */
  labelKey?: string;
  /** Branche annoncée mais pas encore ouverte. */
  comingSoon?: boolean;
  item?: Item;
  upgrade?: ItemUpgrade;
}

/** Dimensions du monde. Les nœuds sont placés dans ce repère, pas en pixels écran. */
const WORLD = { width: 10400, height: 4100 };
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;

/**
 * Boutique présentée comme une carte que l'on parcourt : chaque article est un
 * nœud, ses améliorations gravitent autour de lui, et les améliorations du
 * moyai forment leur propre grappe.
 *
 * Le dévoilement progressif est conservé tel quel : un article dont la
 * condition d'affichage n'est pas remplie reste un nœud anonyme.
 */
@Component({
  selector: 'app-shop-map',
  standalone: true,
  imports: [TranslatePipe, DecimalPipe, FormatAuraPipe],
  templateUrl: './shop-map.html',
  styleUrl: './shop-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopMap {

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  readonly shopManager = inject(ShopManager);
  readonly auraManager = inject(AuraManager);
  private readonly soundManager = inject(SoundManager);
  private readonly hintManager = inject(HintManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly router = inject(Router);

  readonly world = WORLD;
  readonly moyaiIcon = this.modelIcons.moyai();
  readonly questionIcon = this.modelIcons.question();
  readonly arrowIcon = this.modelIcons.arrow();
  readonly buildingIcon = this.modelIcons.shop();

  readonly buyAmount = signal<'1' | '10' | '100' | 'MAX'>('1');

  /** Décalage et échelle de la carte, pilotés par le glissement et la molette. */
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly zoom = signal(0.7);

  readonly transform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`
  );

  private dragging = false;
  private pointerStart = { x: 0, y: 0, panX: 0, panY: 0 };
  /** Un glissement ne doit pas se terminer par un achat involontaire. */
  private moved = false;

  readonly nodes = computed<MapNode[]>(() => {
    const nodes: MapNode[] = [];

    // La carte part du moyai : c'est le seul nœud acquis d'entrée, et tout se
    // ramifie à partir de lui.
    const root = { x: 600, y: 400 };
    nodes.push({
      key: 'root',
      kind: 'root',
      x: root.x,
      y: root.y,
      parent: null,
      labelKey: 'SHOP_ROOT'
    });

    // Première branche : les enseignements, où vivent les articles.
    const teachings = { x: 1450, y: 400 };
    nodes.push({
      key: 'category-teachings',
      kind: 'category',
      x: teachings.x,
      y: teachings.y,
      parent: root,
      labelKey: 'SHOP_CATEGORY_TEACHINGS'
    });

    // Seconde branche : les gains passifs, qui accueilleront les vêtements du
    // moyai. Elle est annoncée mais close tant qu'ils n'ont pas de modèle 3D.
    nodes.push({
      key: 'category-passive',
      kind: 'category',
      x: 600,
      y: 1250,
      parent: root,
      labelKey: 'SHOP_CATEGORY_PASSIVE',
      comingSoon: true
    });

    const items = this.shopManager.getAllItems();
    for (const [index, item] of items.entries()) {
      const x = 2350 + index * 1000;
      const y = 400;
      const previous = index === 0 ? teachings : { x: 2350 + (index - 1) * 1000, y };

      nodes.push({ key: `item-${item.id}`, kind: 'item', x, y, parent: previous, item });

      // Dévoilement d'un cran à la fois : on s'arrête au premier article non
      // dévoilé, qui reste anonyme et cache tout ce qui le suit.
      if (!item.displayCondition()) break;

      // Les améliorations descendent en chaîne sous leur article : chacune
      // ouvre la suivante, et le lien vertical donne à voir cet ordre.
      let previousUpgrade = { x, y };
      for (const [u, upgrade] of (item.upgrades ?? []).entries()) {
        const position = { x, y: 800 + u * 300 };
        nodes.push({
          key: `upgrade-${item.id}-${upgrade.id}`,
          kind: 'upgrade',
          x: position.x,
          y: position.y,
          parent: previousUpgrade,
          item,
          upgrade
        });
        previousUpgrade = position;
        if (!upgrade.unlocked) break;
      }
    }

    return nodes;
  });

  /** Avancement de la boutique, compté en niveaux et exemplaires. */
  readonly progress = computed(() => this.shopManager.progress());

  /** Nœud qui vient d'être acheté, pour lui donner son à-coup. */
  readonly burst = signal<{ key: string; first: boolean } | null>(null);

  // --- Lecture d'un nœud -------------------------------------------------

  /** Un article non dévoilé reste anonyme, comme dans la liste d'origine. */
  /** Un article non dévoilé reste anonyme ; ses améliorations le suivent. */
  isRevealed(node: MapNode): boolean {
    if (node.kind === 'root' || node.kind === 'category') return true;
    return node.item!.displayCondition();
  }

  isOwned(node: MapNode): boolean {
    // La racine est acquise d'entrée : c'est le point de départ.
    if (node.kind === 'root') return true;
    if (node.kind === 'category') return !node.comingSoon;
    if (node.kind === 'upgrade') return this.shopManager.isUpgradeMaxed(node.upgrade!);
    return this.shopManager.isMaxed(node.item!);
  }

  /** Exemplaires achetés sur exemplaires possibles, pour une amélioration. */
  upgradeCount(node: MapNode): string {
    return `${this.shopManager.upgradePurchases(node.upgrade!)} / ${this.shopManager.upgradeMaxPurchases(node.upgrade!)}`;
  }

  /** Une amélioration dont les prérequis manquent n'est pas encore achetable. */
  isAvailable(node: MapNode): boolean {
    if (node.kind !== 'upgrade') return true;
    return this.shopManager.isUpgradeAvailable(node.item!, node.upgrade!);
  }

  isMaxed(node: MapNode): boolean {
    return node.kind === 'item' && this.shopManager.isMaxed(node.item!);
  }

  price(node: MapNode): number {
    // La racine et les catégories ne s'achètent pas : elles n'ont pas
    // d'article derrière elles, et le gabarit lit quand même leur prix.
    if (node.kind === 'root' || node.kind === 'category') return 0;
    if (node.kind === 'upgrade') return this.shopManager.upgradePrice(node.upgrade!);
    return node.item!.price() * this.amountFor(node.item!);
  }

  affordable(node: MapNode): boolean {
    return this.auraManager.auraCount() >= this.price(node);
  }

  amountFor(item: Item): number {
    return this.shopManager.getAmountToBuy(this.buyAmount(), item);
  }

  cycleBuyAmount(): void {
    const order: ('1' | '10' | '100' | 'MAX')[] = ['1', '10', '100', 'MAX'];
    this.buyAmount.set(order[(order.indexOf(this.buyAmount()) + 1) % order.length]);
  }

  // --- Achat -------------------------------------------------------------

  activate(node: MapNode): void {
    if (this.moved) return;

    if (node.kind === 'root' || node.kind === 'category') {
      if (node.comingSoon) this.hintManager.show('SHOP_COMING_SOON_HINT');
      return;
    }

    if (!this.isRevealed(node)) {
      this.hintManager.show('SHOP_LOCKED_HINT');
      return;
    }
    if (this.isOwned(node)) return;
    if (!this.isAvailable(node)) {
      this.hintManager.show('SHOP_LOCKED_HINT');
      return;
    }
    if (!this.affordable(node)) {
      this.hintManager.show('SHOP_TOO_EXPENSIVE_HINT');
      return;
    }

    // Un premier achat se fête plus fort qu'un renfort : on note lequel des
    // deux avant de toucher aux données.
    const first =
      node.kind === 'upgrade'
        ? this.shopManager.upgradePurchases(node.upgrade!) === 0
        : node.item!.level() === 0;

    if (node.kind === 'item') {
      this.shopManager.buyItem(node.item!.id, this.buyAmount());
    } else {
      this.shopManager.unlockUpgrade(node.item!.id, node.upgrade!.id);
    }

    this.celebrate(node, first);
    this.soundManager.playFX(Sound.Buy);
  }

  /**
   * Déclenche l'à-coup visuel du nœud. La classe est retirée puis remise pour
   * que l'animation reparte même sur deux achats consécutifs.
   */
  private celebrate(node: MapNode, first: boolean): void {
    this.burst.set(null);
    // Une image d'écart suffit à ce que le navigateur reparte de zéro.
    requestAnimationFrame(() => this.burst.set({ key: node.key, first }));
    setTimeout(() => {
      if (this.burst()?.key === node.key) this.burst.set(null);
    }, first ? 1100 : 550);

    if (first) {
      const name = node.kind === 'upgrade' ? node.upgrade!.name : node.item!.name();
      this.hintManager.announce({ titleKey: 'SHOP_FIRST_UNLOCK', body: name }, 3200);
    }
  }

  burstState(node: MapNode): 'none' | 'buy' | 'first' {
    const burst = this.burst();
    if (burst?.key !== node.key) return 'none';
    return burst.first ? 'first' : 'buy';
  }

  back(): void {
    this.soundManager.playFX(Sound.Plop);
    this.router.navigate(['/game']);
  }

  // --- Navigation sur la carte -------------------------------------------

  onPointerDown(event: PointerEvent): void {
    this.dragging = true;
    this.moved = false;
    this.pointerStart = { x: event.clientX, y: event.clientY, panX: this.panX(), panY: this.panY() };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.pointerStart.x;
    const dy = event.clientY - this.pointerStart.y;
    // Quelques pixels de tolérance : un clic tremblant reste un clic.
    if (Math.abs(dx) + Math.abs(dy) > 5) this.moved = true;
    this.panX.set(this.pointerStart.panX + dx);
    this.panY.set(this.pointerStart.panY + dy);
  }

  onPointerUp(): void {
    this.dragging = false;
  }

  /** Zoom centré sur le pointeur : le point sous le curseur ne bouge pas. */
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const previous = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, previous * (event.deltaY < 0 ? 1.12 : 1 / 1.12)));
    if (next === previous) return;

    const ratio = next / previous;
    this.panX.set(pointerX - (pointerX - this.panX()) * ratio);
    this.panY.set(pointerY - (pointerY - this.panY()) * ratio);
    this.zoom.set(next);
  }

  zoomBy(factor: number): void {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const previous = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, previous * factor));
    if (next === previous) return;

    const ratio = next / previous;
    this.panX.set(centerX - (centerX - this.panX()) * ratio);
    this.panY.set(centerY - (centerY - this.panY()) * ratio);
    this.zoom.set(next);
  }

  /** Ramène la vue sur le premier article, point d'entrée de la carte. */
  recenter(): void {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    this.zoom.set(0.7);
    // On revient toujours sur la racine, point d'entrée de la carte.
    this.panX.set(rect.width / 2 - 600 * 0.7);
    this.panY.set(rect.height / 2 - 400 * 0.7);
  }

  ngAfterViewInit(): void {
    this.recenter();
  }
}
