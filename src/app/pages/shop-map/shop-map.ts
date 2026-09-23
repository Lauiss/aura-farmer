import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuraManager } from '../../services/aura-manager';
import { HintManager } from '../../services/hint-manager';
import { BuyAmount, Item, ItemUpgrade, Purchasable, ShopManager } from '../../services/shop-manager';
import { MoyaiUpgrades } from '../../components/aura-btn/aura-btn';
import { BackgroundDefinition, BackgroundUpgrade } from '../../three/models/backgrounds';
import { BackgroundManager } from '../../services/background-manager';
import { UtilityDefinition, UtilityManager, UtilityUpgrade } from '../../services/utility-manager';
import { Sound, SoundManager } from '../../services/sound-manager';
import { FormatAuraPipe, formatAura } from '../../pipes/format-aura';
import { ModelIcons } from '../../services/model-icons';
import { GameLoop } from '../../services/game-loop';
import { CollectionManager } from '../../services/collection-manager';
import { UpgradeType } from '../../../assets/static/enum/upgrade-types';
import { StoreManager } from '../../services/store-manager';
import { CHESTS, ChestTier } from '../../../assets/static/collectibles';
import { CONSUMABLES, ConsumableDefinition } from '../../../assets/static/consumables';
import { COMPANIONS, CompanionDefinition } from '../../../assets/static/companions';

type NodeKind =
  | 'root'
  | 'category'
  | 'item'
  | 'upgrade'
  | 'outfit'
  | 'outfit-upgrade'
  | 'background'
  | 'background-upgrade'
  | 'utility'
  | 'utility-upgrade'
  | 'chest-unlock'
  | 'drink-unlock'
  | 'companion';

/** Branche d'un nœud : elle en donne la couleur, comme dans Sludgeneer. */
type Branch = 'root' | 'teachings' | 'outfit' | 'scenery' | 'utilities' | 'store';

export interface MapNode {
  key: string;
  kind: NodeKind;
  branch: Branch;
  x: number;
  y: number;
  /** Nœud parent, pour tracer le lien. `null` pour la racine. */
  parent: { x: number; y: number } | null;
  /** Clé de traduction du libellé, pour la racine et les catégories. */
  labelKey?: string;
  item?: Item;
  upgrade?: ItemUpgrade;
  /** Pièce d'outfit, et son rang dans la liste des améliorations du moyai. */
  piece?: MoyaiUpgrades;
  pieceIndex?: number;
  background?: BackgroundDefinition;
  backgroundUpgrade?: BackgroundUpgrade;
  utility?: UtilityDefinition;
  utilityUpgrade?: UtilityUpgrade;
  /** Rayon de coffres ouvert par ce nœud. */
  chestTier?: ChestTier;
  drink?: ConsumableDefinition;
  companion?: CompanionDefinition;
}

/** Une ligne de l'infobulle : un effet, avec sa valeur actuelle et la suivante. */
interface EffectLine {
  key: string;
  params: Record<string, string>;
}

/** Dimensions du monde. Les nœuds sont placés dans ce repère, pas en pixels écran. */
const WORLD = { width: 12000, height: 9000 };
/** La racine est au centre : chaque branche part dans sa propre direction. */
const CENTER = { x: WORLD.width / 2, y: WORLD.height / 2 };
/**
 * Distance de la racine aux catégories, puis entre deux nœuds voisins. Les
 * branches est et ouest partent plus loin : les améliorations des décors et
 * de l'outfit, qui s'étirent vers la droite, doivent passer avant elles.
 */
const BRANCH = 560;
const SIDE_BRANCH = 1000;
const STEP = 300;
const UPGRADE_STEP = 230;
/** Demi-côté d'une tuile, en unités du monde, pour placer l'infobulle. */
const TILE_HALF = 60;
const HUB_HALF = 85;

const MIN_ZOOM = 0.12;
const MAX_ZOOM = 1.8;
const DEFAULT_ZOOM = 0.55;
/** Largeur de l'infobulle, en pixels écran, pour la garder dans le cadre. */
const TOOLTIP_WIDTH = 320;

/**
 * Boutique présentée comme une carte que l'on parcourt, à la manière de
 * Sludgneer : la racine Moyai au centre, quatre branches qui partent chacune
 * dans sa direction, et des tuiles compactes portant leur niveau. Le détail
 * d'un nœud s'affiche dans une infobulle au survol et au focus clavier.
 *
 * Le dévoilement progressif est conservé : un article dont la condition
 * d'affichage n'est pas remplie reste anonyme et cache tout ce qui le suit.
 */
@Component({
  selector: 'app-shop-map',
  standalone: true,
  imports: [TranslatePipe, FormatAuraPipe],
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
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly gameLoop = inject(GameLoop);
  readonly backgroundManager = inject(BackgroundManager);
  readonly utilityManager = inject(UtilityManager);
  readonly collection = inject(CollectionManager);
  readonly store = inject(StoreManager);

  readonly world = WORLD;
  private readonly icons = {
    moyai: this.modelIcons.moyai(),
    question: this.modelIcons.question(),
    arrow: this.modelIcons.arrow(),
    building: this.modelIcons.shop(),
    hanger: this.modelIcons.hanger(),
    phone: this.modelIcons.phone(),
    weakPoint: this.modelIcons.weakPoint(),
    sniper: this.modelIcons.sniper(),
    gem: this.modelIcons.gem(),
    hourglass: this.modelIcons.hourglass(),
    die: this.modelIcons.die()
  };

  readonly buyAmount = signal<BuyAmount>('1');

  /** Décalage et échelle de la carte, pilotés par le glissement et la molette. */
  readonly panX = signal(0);
  readonly panY = signal(0);
  readonly zoom = signal(DEFAULT_ZOOM);
  private readonly viewportSize = signal({ width: 0, height: 0 });

  readonly transform = computed(
    () => `translate(${this.panX()}px, ${this.panY()}px) scale(${this.zoom()})`
  );

  private dragging = false;
  private pointerStart = { x: 0, y: 0, panX: 0, panY: 0 };
  /** Un glissement ne doit pas se terminer par un achat involontaire. */
  private moved = false;

  readonly nodes = computed<MapNode[]>(() => {
    const nodes: MapNode[] = [];
    const root = CENTER;

    // La carte part du moyai, acquis d'entrée : tout se ramifie à partir de lui.
    nodes.push({ key: 'root', kind: 'root', branch: 'root', x: root.x, y: root.y, parent: null, labelKey: 'SHOP_ROOT' });

    const category = (branch: Exclude<Branch, 'root'>, labelKey: string, dx: number, dy: number) => {
      const spot = { x: root.x + dx * SIDE_BRANCH, y: root.y + dy * BRANCH };
      nodes.push({ key: `category-${branch}`, kind: 'category', branch, ...spot, parent: root, labelKey });
      return spot;
    };

    // --- Est : les enseignements, en ligne, leurs améliorations en colonne,
    // une fois vers le haut, une fois vers le bas pour ne pas se chevaucher.
    const teachings = category('teachings', 'SHOP_CATEGORY_TEACHINGS', 1, 0);
    let previous = teachings;
    for (const [index, item] of this.shopManager.getAllItems().entries()) {
      const spot = { x: teachings.x + (index + 1) * STEP * 1.15, y: teachings.y };
      nodes.push({ key: `item-${item.id}`, kind: 'item', branch: 'teachings', ...spot, parent: previous, item });
      previous = spot;

      // Dévoilement d'un cran à la fois : on s'arrête au premier article non
      // dévoilé, qui reste anonyme et cache tout ce qui le suit.
      if (!item.displayCondition()) break;

      const direction = index % 2 === 0 ? -1 : 1;
      let parent = spot;
      for (const [u, upgrade] of (item.upgrades ?? []).entries()) {
        const position = { x: spot.x, y: spot.y + direction * (u + 1) * UPGRADE_STEP };
        nodes.push({
          key: `upgrade-${item.id}-${upgrade.id}`,
          kind: 'upgrade',
          branch: 'teachings',
          ...position,
          parent,
          item,
          upgrade
        });
        parent = position;
        if (!this.shopManager.isUpgradeOwned(upgrade)) break;
      }
    }

    // --- Sud : l'outfit. Les pièces descendent, leurs améliorations partent
    // vers la droite. Les pièces ne se conditionnent pas l'une l'autre.
    const outfit = category('outfit', 'SHOP_CATEGORY_OUTFIT', 0, 1);
    previous = outfit;
    this.shopManager.moyaiUpgrades().forEach((piece, index) => {
      const spot = { x: outfit.x, y: outfit.y + (index + 1) * STEP };
      nodes.push({ key: `outfit-${piece.id}`, kind: 'outfit', branch: 'outfit', ...spot, parent: previous, piece, pieceIndex: index });
      previous = spot;
      if (!piece.unlocked) return;

      let parent = spot;
      for (const [u, upgrade] of (piece.upgrades ?? []).entries()) {
        const position = { x: spot.x + (u + 1) * STEP, y: spot.y };
        nodes.push({
          key: `outfit-upgrade-${piece.id}-${upgrade.id}`,
          kind: 'outfit-upgrade',
          branch: 'outfit',
          ...position,
          parent,
          piece,
          pieceIndex: index,
          upgrade
        });
        parent = position;
        if (!this.shopManager.isUpgradeOwned(upgrade)) break;
      }
    });

    // --- Nord : les décors, qui montent, leurs améliorations vers la droite.
    const scenery = category('scenery', 'SHOP_CATEGORY_SCENERY', 0, -1);
    previous = scenery;
    this.backgroundManager.catalogue.forEach((background, index) => {
      const spot = { x: scenery.x, y: scenery.y - (index + 1) * STEP };
      nodes.push({ key: `background-${background.id}`, kind: 'background', branch: 'scenery', ...spot, parent: previous, background });
      previous = spot;
      if (!this.backgroundManager.isOwned(background.id)) return;

      let parent = spot;
      for (const [u, upgrade] of background.upgrades.entries()) {
        const position = { x: spot.x + (u + 1) * STEP, y: spot.y };
        nodes.push({
          key: `background-upgrade-${background.id}-${upgrade.id}`,
          kind: 'background-upgrade',
          branch: 'scenery',
          ...position,
          parent,
          background,
          backgroundUpgrade: upgrade
        });
        parent = position;
        if (!this.shopManager.isUpgradeOwned(upgrade)) break;
      }
    });

    // --- Ouest : les utilitaires, en ligne, leurs améliorations en colonne.
    const tools = category('utilities', 'SHOP_CATEGORY_UTILITIES', -1, 0);
    previous = tools;
    this.utilityManager.visibleCatalogue().forEach((utility, index) => {
      const spot = { x: tools.x - (index + 1) * STEP * 1.15, y: tools.y };
      nodes.push({ key: `utility-${utility.id}`, kind: 'utility', branch: 'utilities', ...spot, parent: previous, utility });
      previous = spot;
      if (!this.utilityManager.isOwned(utility.id)) return;

      const direction = index % 2 === 0 ? -1 : 1;
      let parent = spot;
      for (const [u, upgrade] of utility.upgrades.entries()) {
        const position = { x: spot.x, y: spot.y + direction * (u + 1) * UPGRADE_STEP };
        nodes.push({
          key: `utility-upgrade-${utility.id}-${upgrade.id}`,
          kind: 'utility-upgrade',
          branch: 'utilities',
          ...position,
          parent,
          utility,
          utilityUpgrade: upgrade
        });
        parent = position;
        if (!this.shopManager.isUpgradeOwned(upgrade)) break;
      }
    });

    // --- Nord-est : la boutique. Les rayons partent vers le haut, les
    // compagnons descendent depuis une sous-catégorie qui leur est propre.
    const store = category('store', 'SHOP_CATEGORY_STORE', 1, -1);

    previous = store;
    for (const [index, chest] of CHESTS.filter(c => c.price !== null).entries()) {
      const spot = { x: store.x + (index + 1) * STEP, y: store.y - STEP * 0.85 };
      nodes.push({
        key: `chest-${chest.tier}`,
        kind: 'chest-unlock',
        branch: 'store',
        ...spot,
        parent: previous,
        chestTier: chest.tier
      });
      previous = spot;
      if (!this.store.isChestUnlocked(chest.tier)) break;
    }

    previous = store;
    for (const [index, drink] of CONSUMABLES.entries()) {
      const spot = { x: store.x + (index + 1) * STEP, y: store.y + STEP * 0.85 };
      nodes.push({
        key: `drink-${drink.id}`,
        kind: 'drink-unlock',
        branch: 'store',
        ...spot,
        parent: previous,
        drink
      });
      previous = spot;
      // Un cran à la fois, comme les enseignements : on ne voit jamais plus
      // loin que la canette suivante.
      if (!this.store.isDrinkUnlocked(drink.id)) break;
    }

    // Sous-catégorie des compagnons, au-dessus de la boutique. Ils s'étirent
    // vers la **droite** : vers la gauche, ils traversaient la colonne des
    // décors qui monte depuis la racine.
    const companionsHub = { x: store.x, y: store.y - SIDE_BRANCH * 0.55 };
    nodes.push({
      key: 'category-companions',
      kind: 'category',
      branch: 'store',
      ...companionsHub,
      parent: store,
      labelKey: 'SHOP_CATEGORY_COMPANIONS'
    });

    previous = companionsHub;
    for (const [index, companion] of COMPANIONS.entries()) {
      const spot = { x: companionsHub.x + (index + 1) * STEP, y: companionsHub.y };
      nodes.push({
        key: `companion-${companion.id}`,
        kind: 'companion',
        branch: 'store',
        ...spot,
        parent: previous,
        companion
      });
      previous = spot;
      if (!this.store.hasCompanion(companion.id)) break;
    }

    return nodes;
  });

  /**
   * Avancement de la boutique : la somme des niveaux **affichés sur la carte**,
   * sur la somme de leurs maximums. Compter aussi les améliorations encore
   * masquées donnait un total impossible à retrouver en additionnant les
   * tuiles (390 affichés pour 375 visibles).
   */
  readonly progress = computed(() => {
    let owned = 0;
    let total = 0;
    for (const node of this.nodes()) {
      const level = this.levelOf(node);
      if (!level) continue;
      owned += level.current;
      total += level.max;
    }
    return { owned, total };
  });

  /** Nœud qui vient d'être acheté, pour lui donner son à-coup. */
  readonly burst = signal<{ key: string; first: boolean } | null>(null);

  /** Angles des éclats projetés à l'achat, répartis tout autour du nœud. */
  readonly sparks = Array.from({ length: 10 }, (_, i) => i * 36);

  // --- Infobulle ---------------------------------------------------------

  /** Nœud survolé ou sélectionné au clavier. */
  readonly hovered = signal<string | null>(null);

  readonly hoveredNode = computed(() => {
    const key = this.hovered();
    return key ? this.nodes().find(node => node.key === key) ?? null : null;
  });

  /**
   * Position de l'infobulle, en pixels écran. Elle se calcule depuis la carte
   * plutôt que depuis le DOM : elle suit ainsi le déplacement et le zoom sans
   * mesure. Elle passe à gauche du nœud quand la droite manque de place.
   */
  readonly tooltipPosition = computed(() => {
    const node = this.hoveredNode();
    if (!node) return null;

    const zoom = this.zoom();
    const half = (this.isHub(node) ? HUB_HALF : TILE_HALF) * zoom;
    const x = this.panX() + node.x * zoom;
    const y = this.panY() + node.y * zoom;
    const { width, height } = this.viewportSize();

    const onRight = x + half + 16 + TOOLTIP_WIDTH < width;
    const left = onRight ? x + half + 16 : x - half - 16 - TOOLTIP_WIDTH;
    return {
      left: Math.max(8, left),
      top: Math.min(Math.max(y, 150), Math.max(150, height - 150)),
      side: onRight ? 'right' : 'left'
    };
  });

  showTooltip(node: MapNode): void {
    if (this.dragging && this.moved) return;
    this.measureViewport();
    this.hovered.set(node.key);
  }

  hideTooltip(node: MapNode): void {
    if (this.hovered() === node.key) this.hovered.set(null);
  }

  // --- Lecture d'un nœud -------------------------------------------------

  isHub(node: MapNode): boolean {
    return node.kind === 'root' || node.kind === 'category';
  }

  /** Un article non dévoilé reste anonyme ; le reste est visible d'entrée. */
  isRevealed(node: MapNode): boolean {
    if (node.kind === 'item') return node.item!.displayCondition();
    if (node.kind === 'outfit') return node.piece!.displayCondition();
    return true;
  }

  isOwned(node: MapNode): boolean {
    // La racine et les catégories sont acquises d'entrée : ce sont les
    // points de départ de chaque branche.
    if (this.isHub(node)) return true;
    const level = this.levelOf(node)!;
    return level.current >= level.max;
  }

  /** Niveau courant et maximal d'un nœud achetable, `null` pour les autres. */
  levelOf(node: MapNode): { current: number; max: number } | null {
    switch (node.kind) {
      case 'item':
        return { current: node.item!.level(), max: node.item!.maxLevel };
      case 'upgrade':
      case 'outfit-upgrade':
        return this.copies(node.upgrade!);
      case 'utility-upgrade':
        return this.copies(node.utilityUpgrade!);
      case 'background-upgrade':
        return this.copies(node.backgroundUpgrade!);
      case 'outfit':
        return { current: node.piece!.unlocked ? 1 : 0, max: 1 };
      case 'background':
        return { current: this.backgroundManager.isOwned(node.background!.id) ? 1 : 0, max: 1 };
      case 'utility':
        return { current: this.utilityManager.isOwned(node.utility!.id) ? 1 : 0, max: 1 };
      case 'chest-unlock':
        return { current: this.store.isChestUnlocked(node.chestTier!) ? 1 : 0, max: 1 };
      case 'drink-unlock':
        return { current: this.store.isDrinkUnlocked(node.drink!.id) ? 1 : 0, max: 1 };
      case 'companion':
        return { current: this.store.hasCompanion(node.companion!.id) ? 1 : 0, max: 1 };
      default:
        return null;
    }
  }

  private copies(upgrade: Purchasable): { current: number; max: number } {
    return {
      current: this.shopManager.upgradePurchases(upgrade),
      max: this.shopManager.upgradeMaxPurchases(upgrade)
    };
  }

  /** Nom affiché d'un nœud, déjà traduit. */
  nodeName(node: MapNode): string {
    if (this.isHub(node)) return this.translate.instant(node.labelKey!);
    if (!this.isRevealed(node)) return '?????';
    switch (node.kind) {
      case 'item':
        return node.item!.name();
      case 'outfit':
        return this.translate.instant(`COSMETIC_${node.piece!.name.toUpperCase()}`);
      case 'background':
        return this.translate.instant(`BACKGROUND_${node.background!.id.toUpperCase()}`);
      case 'utility':
        return this.translate.instant(`UTILITY_${node.utility!.id.toUpperCase()}`);
      case 'chest-unlock':
      case 'drink-unlock':
      case 'companion':
        return this.storeName(node);
      case 'utility-upgrade':
        return this.translate.instant(node.utilityUpgrade!.name);
      case 'background-upgrade':
        return this.translate.instant(node.backgroundUpgrade!.name);
      default:
        return this.translate.instant(node.upgrade!.name);
    }
  }

  /** Nom d'un nœud de la branche boutique. */
  private storeName(node: MapNode): string {
    if (node.chestTier) return this.translate.instant(`CHEST_${node.chestTier.toUpperCase()}`);
    if (node.drink) return this.translate.instant(`DRINK_${node.drink.id.toUpperCase()}`);
    return this.translate.instant(`COMPANION_${node.companion!.id.toUpperCase()}`);
  }

  /** Nature du nœud, en sous-titre de l'infobulle. */
  kindLabel(node: MapNode): string {
    const keys: Record<NodeKind, string> = {
      root: 'SHOP_KIND_ROOT',
      category: 'SHOP_KIND_CATEGORY',
      item: 'SHOP_KIND_ITEM',
      upgrade: 'SHOP_KIND_UPGRADE',
      outfit: 'SHOP_KIND_OUTFIT',
      'outfit-upgrade': 'SHOP_KIND_UPGRADE',
      background: 'SHOP_KIND_BACKGROUND',
      'background-upgrade': 'SHOP_KIND_UPGRADE',
      utility: 'SHOP_KIND_UTILITY',
      'utility-upgrade': 'SHOP_KIND_UPGRADE',
      'chest-unlock': 'SHOP_KIND_SHELF',
      'drink-unlock': 'SHOP_KIND_SHELF',
      companion: 'SHOP_KIND_COMPANION'
    };
    return keys[node.kind];
  }

  icon(node: MapNode): string {
    if (!this.isRevealed(node)) return this.icons.question;
    switch (node.kind) {
      case 'root':
      case 'item':
        return this.icons.moyai;
      case 'category':
        return node.branch === 'outfit' ? this.icons.hanger : this.icons.building;
      case 'outfit':
        return this.icons.hanger;
      case 'background':
        return this.icons.building;
      case 'chest-unlock':
        return this.modelIcons.chest(node.chestTier!);
      case 'drink-unlock':
        return this.modelIcons.can(node.drink!.id);
      case 'companion':
        return this.modelIcons.companion(node.companion!.id);
      case 'utility':
        switch (node.utility!.id) {
          case 'doomscroll':
            return this.icons.phone;
          case 'weakpoints':
            return this.icons.weakPoint;
          case 'spin':
            return this.icons.moyai;
          case 'prospect':
            return this.icons.gem;
          case 'dice':
            return this.icons.die;
          case 'combo':
            return this.icons.arrow;
          case 'slumber':
            return this.icons.hourglass;
          default:
            return this.icons.sniper;
        }
      default:
        return this.icons.arrow;
    }
  }

  /** Une amélioration dont les prérequis manquent n'est pas encore achetable. */
  isAvailable(node: MapNode): boolean {
    if (node.kind === 'upgrade') {
      return this.shopManager.isUpgradeAvailable(node.item!.upgrades ?? [], node.upgrade!);
    }
    if (node.kind === 'outfit-upgrade') {
      return this.shopManager.isUpgradeAvailable(node.piece!.upgrades ?? [], node.upgrade!);
    }
    if (node.kind === 'utility-upgrade') {
      return this.shopManager.isUpgradeAvailable(node.utility!.upgrades, node.utilityUpgrade!);
    }
    if (node.kind === 'background-upgrade') {
      return this.shopManager.isUpgradeAvailable(node.background!.upgrades, node.backgroundUpgrade!);
    }
    return true;
  }

  price(node: MapNode): number {
    switch (node.kind) {
      // La racine et les catégories ne s'achètent pas, mais le gabarit lit
      // quand même leur prix pour décider des classes.
      case 'root':
      case 'category':
        return 0;
      case 'item':
        return this.shopManager.batchPrice(node.item!, this.amountFor(node.item!));
      case 'outfit':
        return node.piece!.price;
      case 'background':
        return node.background!.price;
      case 'utility':
        return node.utility!.price;
      case 'chest-unlock':
        return this.store.chestPrice(node.chestTier!);
      case 'drink-unlock':
        return node.drink!.unlockPrice;
      case 'companion':
        return node.companion!.price;
      // Les améliorations suivent le réglage d'achat multiple comme les
      // articles : le prix affiché est celui du lot, pas d'un exemplaire.
      case 'utility-upgrade':
        return this.upgradePriceFor(node, node.utilityUpgrade!);
      case 'background-upgrade':
        return this.upgradePriceFor(node, node.backgroundUpgrade!);
      default:
        return this.upgradePriceFor(node, node.upgrade!);
    }
  }

  private upgradePriceFor(node: MapNode, upgrade: Purchasable): number {
    return this.shopManager.upgradeBatchPrice(upgrade, Math.max(1, this.copiesFor(node)));
  }

  /** Exemplaires visés par le réglage courant, pour l'affichage du prix. */
  copiesFor(node: MapNode): number {
    return this.upgradeCount(node, this.buyAmount());
  }

  affordable(node: MapNode): boolean {
    return this.auraManager.auraCount() >= this.price(node);
  }

  amountFor(item: Item): number {
    return this.shopManager.getAmountToBuy(this.buyAmount(), item);
  }

  /** État d'une tuile, qui en commande l'apparence. */
  state(node: MapNode): 'locked' | 'owned' | 'ready' | 'poor' | 'blocked' {
    if (!this.isRevealed(node)) return 'locked';
    if (this.isOwned(node)) return 'owned';
    if (!this.isAvailable(node)) return 'blocked';
    return this.affordable(node) ? 'ready' : 'poor';
  }

  /**
   * Effet d'un nœud, avec la valeur actuelle et celle qu'apporterait l'achat
   * suivant — le « 100 % > 150 % » de Sludgneer.
   */
  effectLines(node: MapNode): EffectLine[] {
    const factor = (value: number) => `×${Number(value.toFixed(2))}`;

    switch (node.kind) {
      case 'item': {
        const item = node.item!;
        const perLevel = item.value() * this.shopManager.finalMultiplier() * this.shopManager.styleBonus();
        return [
          { key: 'SHOP_EFFECT_PER_LEVEL', params: { value: formatAura(perLevel) } },
          { key: 'SHOP_EFFECT_ITEM_TOTAL', params: { value: formatAura(perLevel * item.level()) } }
        ];
      }
      case 'upgrade':
      case 'outfit-upgrade':
      case 'outfit': {
        const effect = node.kind === 'outfit' ? node.piece!.effect : node.upgrade!.effect;
        const copies = node.kind === 'outfit' ? (node.piece!.unlocked ? 1 : 0) : this.shopManager.upgradePurchases(node.upgrade!);
        const target = effect.targetItemId?.length
          ? this.shopManager.getAllItems().filter(item => effect.targetItemId!.includes(item.id)).map(item => item.name()).join(', ')
          : '';
        const key =
          effect.type === UpgradeType.CLICK
            ? 'SHOP_EFFECT_CLICK'
            : effect.type === UpgradeType.PRICE_REDUCTION
              ? 'SHOP_EFFECT_PRICE'
              : target
                ? 'SHOP_EFFECT_ITEM'
                : 'SHOP_EFFECT_GLOBAL';
        const lines: EffectLine[] = [{
          key,
          params: {
            from: factor(1 + effect.value * copies),
            to: factor(1 + effect.value * (copies + 1)),
            item: target
          }
        }];
        if (node.kind === 'outfit') lines.push({ key: 'SHOP_EFFECT_WEAR', params: {} });
        return lines;
      }
      case 'background': {
        const bonus = Math.round(this.backgroundManager.backgroundBonus(node.background!.id) * 100);
        return [{ key: 'SHOP_EFFECT_BACKGROUND', params: { value: `${bonus}` } }];
      }
      case 'background-upgrade': {
        const current = this.backgroundManager.backgroundBonus(node.background!.id);
        return [
          {
            key: 'STAT_BACKGROUND_BONUS',
            params: {
              name: this.translate.instant(`BACKGROUND_${node.background!.id.toUpperCase()}`),
              from: `${Math.round(current * 100)}`,
              to: `${Math.round((current + node.backgroundUpgrade!.value) * 100)}`
            }
          }
        ];
      }
      case 'utility':
        return [{ key: `UTILITY_${node.utility!.id.toUpperCase()}_DESC`, params: {} }];
      case 'utility-upgrade':
        return [this.utilityEffect(node.utilityUpgrade!)];
      case 'chest-unlock':
        return [{ key: 'SHOP_SHELF_CHEST_DESC', params: {} }];
      case 'drink-unlock':
        return [
          {
            key: 'SHOP_SHELF_DRINK_DESC',
            params: {
              multiplier: `${node.drink!.multiplier}`,
              minutes: `${Math.round(node.drink!.duration / 60)}`
            }
          }
        ];
      case 'companion':
        return [
          { key: 'SHOP_COMPANION_DESC', params: { value: `${Math.round(node.companion!.bonus * 100)}` } }
        ];
      default:
        return [{ key: `SHOP_HUB_${node.branch.toUpperCase()}_DESC`, params: {} }];
    }
  }

  private utilityEffect(upgrade: UtilityUpgrade): EffectLine {
    const u = this.utilityManager;
    const round = (value: number) => `${Number(value.toFixed(2))}`;
    const percent = (value: number) => `${Math.round(value * 100)}`;
    const step = upgrade.value;
    const config = u.weakPointConfig();

    switch (upgrade.stat) {
      case 'critMultiplier':
        return { key: 'STAT_CRIT', params: { from: round(u.critMultiplier()), to: round(u.critMultiplier() + step) } };
      case 'weakPointCombo':
        return { key: 'STAT_WEAKPOINT_COMBO', params: { from: round(u.weakPointCombo()), to: round(u.weakPointCombo() + step) } };
      case 'weakPointSize':
        return { key: 'STAT_WEAKPOINT_SIZE', params: { from: percent(config?.size ?? 1), to: percent((config?.size ?? 1) + step) } };
      case 'weakPointLifetime':
        return { key: 'STAT_WEAKPOINT_LIFETIME', params: { from: round(config?.lifetime ?? 0), to: round((config?.lifetime ?? 0) + step) } };
      case 'luck':
        return { key: 'STAT_LUCK', params: { from: percent(u.doomscrollLuck()), to: percent(Math.min(0.9, u.doomscrollLuck() + step)) } };
      case 'payout':
        return { key: 'STAT_PAYOUT', params: { from: round(u.doomscrollPayout()), to: round(u.doomscrollPayout() + step) } };
      case 'scrollCombo':
        return { key: 'STAT_SCROLL_COMBO', params: { from: round(u.doomscrollCombo()), to: round(u.doomscrollCombo() + step) } };
      case 'autoScroll':
        return { key: 'STAT_AUTOSCROLL', params: {} };
      case 'chestChance':
        return { key: 'STAT_CHEST_CHANCE', params: { from: round(u.chestChance() * 100), to: round((u.chestChance() + step) * 100) } };
      case 'inertia': {
        // Durée de l'élan, relative à celle d'une statue sans utilitaire.
        const glide = (inertia: number) => `${Math.round(100 / (1 - Math.min(0.9, inertia)))}`;
        return { key: 'STAT_INERTIA', params: { from: glide(u.inertia()), to: glide(u.inertia() + step) } };
      }
      case 'autoSpin':
        return { key: 'STAT_AUTOSPIN', params: {} };
      case 'gemChance':
        return { key: 'STAT_GEM_CHANCE', params: { from: round(u.gemClickChance() * 100), to: round((u.gemClickChance() + step) * 100) } };
      case 'gemCritChance':
        return { key: 'STAT_GEM_CRIT', params: { from: round(u.gemCritChance() * 100), to: round((u.gemCritChance() + step) * 100) } };
      case 'gemAmount':
        return { key: 'STAT_GEM_AMOUNT', params: { from: round(u.gemAmount()), to: round(u.gemAmount() + step) } };
      case 'offlineHours':
        return { key: 'STAT_OFFLINE_HOURS', params: { from: round(u.offlineCapSeconds() / 3600), to: round(u.offlineCapSeconds() / 3600 + step) } };
      case 'offlineRate':
        return { key: 'STAT_OFFLINE_RATE', params: { from: percent(u.offlineRate()), to: percent(u.offlineRate() + step) } };
      case 'trickshotChance':
        return { key: 'STAT_TRICKSHOT_CHANCE', params: { from: round(u.trickshotChance() * 100), to: round((u.trickshotChance() + step) * 100) } };
      case 'trickshotPower':
        return { key: 'STAT_TRICKSHOT_POWER', params: { from: round(u.trickshotPower()), to: round(u.trickshotPower() + step) } };
      case 'comboSpeed':
        return { key: 'STAT_COMBO_SPEED', params: { from: round(u.comboSpeedBonus()), to: round(u.comboSpeedBonus() + step) } };
      case 'comboTurn':
        return { key: 'STAT_COMBO_TURN', params: { from: round(u.comboTurnBonus()), to: round(u.comboTurnBonus() + step) } };
      case 'comboFloor':
        return { key: 'STAT_COMBO_FLOOR', params: { from: round(1 + u.comboFloor()), to: round(1 + u.comboFloor() + step) } };
      case 'comboHold':
        return { key: 'STAT_COMBO_HOLD', params: { from: percent(u.comboHold()), to: percent(Math.min(0.85, u.comboHold() + step)) } };
      case 'dieLuck':
        return { key: 'STAT_DIE_LUCK', params: { from: round(u.dieLuck() * 100), to: round((u.dieLuck() + step) * 100) } };
    }
  }

  /** Cases de progression : une par niveau quand il y en a peu. */
  pips(node: MapNode): boolean[] {
    const level = this.levelOf(node);
    if (!level || level.max > 10) return [];
    return Array.from({ length: level.max }, (_, i) => i < level.current);
  }

  /** Remplissage de la jauge, pour les articles à vingt-cinq niveaux. */
  levelRatio(node: MapNode): number {
    const level = this.levelOf(node);
    return level ? level.current / level.max : 0;
  }

  /** Consigne en pied d'infobulle : ce qui empêche l'achat, ou comment acheter. */
  actionHint(node: MapNode): string {
    switch (this.state(node)) {
      case 'locked':
        return 'SHOP_TOOLTIP_LOCKED';
      case 'blocked':
        return 'SHOP_TOOLTIP_BLOCKED';
      case 'owned':
        return this.isHub(node) ? '' : 'SHOP_TOOLTIP_OWNED';
      case 'poor':
        return 'SHOP_TOOLTIP_POOR';
      default:
        return 'SHOP_TOOLTIP_BUY';
    }
  }

  cycleBuyAmount(): void {
    const order: BuyAmount[] = ['1', '10', 'MAX'];
    this.buyAmount.set(order[(order.indexOf(this.buyAmount()) + 1) % order.length]);
  }

  // --- Achat -------------------------------------------------------------

  /**
   * Quantité visée pour ce clic. `Maj` force le maximum sans toucher au
   * réglage courant : c'est le raccourci attendu dans un clicker, on n'a pas
   * envie de faire défiler ×1 → ×10 → max pour un seul achat groupé.
   */
  private wantedAmount(event?: MouseEvent): BuyAmount {
    return event?.shiftKey ? 'MAX' : this.buyAmount();
  }

  /** Exemplaires d'une amélioration visés, plafond compris. */
  private upgradeCount(node: MapNode, amount: BuyAmount): number {
    const level = this.levelOf(node);
    if (!level) return 0;
    const remaining = level.max - level.current;
    const wanted = amount === '1' ? 1 : amount === '10' ? 10 : remaining;
    return Math.max(0, Math.min(wanted, remaining));
  }

  /**
   * Achète plusieurs exemplaires d'une amélioration. Chacun renchérit le
   * suivant : on s'arrête au premier refus, faute d'aura ou parce que le
   * plafond est atteint. Les améliorations ignoraient jusqu'ici le réglage
   * d'achat multiple et n'en prenaient qu'un seul.
   */
  private buyUpgradeCopies(node: MapNode, amount: BuyAmount): void {
    const count = this.upgradeCount(node, amount);
    for (let i = 0; i < count; i++) {
      if (!this.buyOneUpgrade(node)) break;
    }
  }

  private buyOneUpgrade(node: MapNode): boolean {
    switch (node.kind) {
      case 'utility-upgrade':
        return this.utilityManager.buyUpgrade(node.utility!.id, node.utilityUpgrade!.id);
      case 'background-upgrade':
        return this.backgroundManager.buyUpgrade(node.background!.id, node.backgroundUpgrade!.id);
      case 'outfit-upgrade':
        return this.shopManager.buyOutfitUpgrade(node.pieceIndex!, node.upgrade!.id);
      default:
        return this.shopManager.unlockUpgrade(node.item!.id, node.upgrade!.id);
    }
  }

  activate(node: MapNode, event?: MouseEvent): void {
    // Un glissement de la carte ne doit pas finir en achat ; une activation au
    // clavier (`detail` à 0) n'a, elle, rien glissé.
    if (this.moved && event?.detail !== 0) return;
    if (this.isHub(node)) return;

    if (!this.isRevealed(node) || !this.isAvailable(node)) {
      this.hintManager.show('SHOP_LOCKED_HINT');
      return;
    }
    if (this.isOwned(node)) return;
    if (!this.affordable(node)) {
      this.hintManager.show('SHOP_TOO_EXPENSIVE_HINT');
      return;
    }

    // Un premier achat se fête plus fort qu'un renfort : on note lequel des
    // deux avant de toucher aux données.
    const first = this.levelOf(node)!.current === 0;
    const amount = this.wantedAmount(event);

    switch (node.kind) {
      case 'item':
        this.shopManager.buyItem(node.item!.id, amount);
        break;
      case 'outfit':
        this.shopManager.buyMoyaiUpgrade(node.pieceIndex!);
        break;
      case 'background':
        this.backgroundManager.buy(node.background!.id);
        break;
      case 'utility':
        if (this.utilityManager.buy(node.utility!.id)) {
          this.hintManager.show(`UTILITY_${node.utility!.id.toUpperCase()}_HINT`);
        }
        break;
      case 'chest-unlock':
        this.store.unlockChest(node.chestTier!);
        break;
      case 'drink-unlock':
        this.store.unlockDrink(node.drink!);
        break;
      case 'companion':
        if (this.store.buyCompanion(node.companion!)) {
          this.hintManager.show(`COMPANION_${node.companion!.id.toUpperCase()}_HINT`);
        }
        break;
      default:
        // Toutes les familles d'améliorations passent par le même chemin, et
        // obéissent donc au même réglage d'achat multiple.
        this.buyUpgradeCopies(node, amount);
    }

    // Un premier achat et un palier atteint se fêtent fort ; un renfort
    // ordinaire se contente de quelques éclats.
    this.celebrate(node, first || this.isOwned(node));
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
      this.hintManager.announce({ titleKey: 'SHOP_FIRST_UNLOCK', body: this.nodeName(node) }, 3200);
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
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) return;
    const dx = event.clientX - this.pointerStart.x;
    const dy = event.clientY - this.pointerStart.y;
    // Quelques pixels de tolérance : un clic tremblant reste un clic.
    if (!this.moved && Math.abs(dx) + Math.abs(dy) > 5) {
      this.moved = true;
      // Capturé seulement une fois le glissement engagé : capturer dès
      // l'appui détournait le clic du nœud vers la surface.
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      this.hovered.set(null);
    }
    if (!this.moved) return;
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
    this.zoomAround(event.clientX - rect.left, event.clientY - rect.top, event.deltaY < 0 ? 1.12 : 1 / 1.12);
  }

  zoomBy(factor: number): void {
    const { width, height } = this.measureViewport();
    this.zoomAround(width / 2, height / 2, factor);
  }

  private zoomAround(pointerX: number, pointerY: number, factor: number): void {
    const previous = this.zoom();
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, previous * factor));
    if (next === previous) return;

    const ratio = next / previous;
    this.panX.set(pointerX - (pointerX - this.panX()) * ratio);
    this.panY.set(pointerY - (pointerY - this.panY()) * ratio);
    this.zoom.set(next);
  }

  /** Ramène la vue sur la racine, point d'entrée de la carte. */
  recenter(): void {
    const { width, height } = this.measureViewport();
    this.zoom.set(DEFAULT_ZOOM);
    this.panX.set(width / 2 - CENTER.x * DEFAULT_ZOOM);
    this.panY.set(height / 2 - CENTER.y * DEFAULT_ZOOM);
  }

  private measureViewport(): { width: number; height: number } {
    const rect = this.viewport().nativeElement.getBoundingClientRect();
    const size = { width: rect.width, height: rect.height };
    this.viewportSize.set(size);
    return size;
  }

  ngOnInit(): void {
    // Arriver directement ici doit charger la partie : sans cet appel, la
    // carte s'ouvrait sur le compte d'aura initial.
    this.gameLoop.start();
  }

  ngAfterViewInit(): void {
    this.recenter();
  }
}
