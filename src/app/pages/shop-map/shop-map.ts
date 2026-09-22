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

type NodeKind = 'item' | 'upgrade';

export interface MapNode {
  key: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Nœud parent, pour tracer le lien. `null` pour les têtes de branche. */
  parent: { x: number; y: number } | null;
  item?: Item;
  upgrade?: ItemUpgrade;
}

/** Dimensions du monde. Les nœuds sont placés dans ce repère, pas en pixels écran. */
const WORLD = { width: 8800, height: 2900 };
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
    const items = this.shopManager.getAllItems();

    for (const [index, item] of items.entries()) {
      const revealed = item.displayCondition();
      const x = 700 + index * 1000;
      const y = 640;
      const previous = index === 0 ? null : { x: 700 + (index - 1) * 1000, y };

      nodes.push({ key: `item-${item.id}`, kind: 'item', x, y, parent: previous, item });

      // Dévoilement d'un cran à la fois : on s'arrête au premier article non
      // dévoilé, qui reste anonyme et cache tout ce qui le suit. Le joueur ne
      // voit donc jamais plus loin que sa prochaine étape.
      if (!revealed) break;

      // Les améliorations descendent en chaîne sous leur article : chacune
      // ouvre la suivante, et le lien vertical donne à voir cet ordre.
      const upgrades = item.upgrades ?? [];
      let previousUpgrade = { x, y };
      for (const [u, upgrade] of upgrades.entries()) {
        const position = { x, y: 1060 + u * 300 };
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

        // On s'arrête à la première amélioration encore fermée : comme pour
        // les articles, le joueur ne voit qu'un cran devant lui.
        if (!upgrade.unlocked) break;
      }
    }

    return nodes;
  });

  // --- Lecture d'un nœud -------------------------------------------------

  /** Un article non dévoilé reste anonyme, comme dans la liste d'origine. */
  /** Un article non dévoilé reste anonyme ; ses améliorations le suivent. */
  isRevealed(node: MapNode): boolean {
    return node.item!.displayCondition();
  }

  isOwned(node: MapNode): boolean {
    if (node.kind === 'upgrade') return node.upgrade!.unlocked;
    return this.shopManager.isMaxed(node.item!);
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
    if (node.kind === 'upgrade') return node.upgrade!.price;
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

    if (node.kind === 'item') {
      this.shopManager.buyItem(node.item!.id, this.buyAmount());
    } else {
      this.shopManager.unlockUpgrade(node.item!.id, node.upgrade!.id);
    }

    this.soundManager.playFX(Sound.Buy);
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
    this.panX.set(rect.width / 2 - 700 * 0.7);
    this.panY.set(rect.height / 2 - 900 * 0.7);
  }

  ngAfterViewInit(): void {
    this.recenter();
  }
}
