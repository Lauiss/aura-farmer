import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import * as THREE from 'three';
import { disposeObject } from '../../three/geometry';
import { createChest } from '../../three/models/chest';
import { ChestReward, CollectionManager } from '../../services/collection-manager';
import { ModalManager } from '../../services/modal-manager';
import { ModelIcons } from '../../services/model-icons';
import { Sound, SoundManager } from '../../services/sound-manager';
import { FormatAuraPipe } from '../../pipes/format-aura';
import { ChestTier, RARITIES, RARITY_COLORS, Rarity } from '../../../assets/static/collectibles';

type Phase = 'idle' | 'rolling' | 'opening' | 'reveal';

/** Durées des étapes, en secondes. */
const ROLL_DURATION = 1.6;
const OPEN_DURATION = 0.75;

/**
 * Ouverture d'un coffre, à la manière de Vampire Survivors : le coffre
 * tremble pendant que la couleur des rayons défile sur les raretés en
 * ralentissant, se pose sur la bonne, puis le couvercle saute, un faisceau
 * jaillit et la récompense apparaît.
 *
 * La récompense est tirée et créditée **au clic** : refermer la modale pendant
 * l'animation ne la fait pas perdre.
 */
@Component({
  selector: 'app-chest-opening',
  standalone: true,
  imports: [TranslatePipe, FormatAuraPipe],
  templateUrl: './chest-opening.html',
  styleUrl: './chest-opening.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChestOpening implements AfterViewInit, OnDestroy {

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly stageRef = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly zone = inject(NgZone);
  private readonly modalManager = inject(ModalManager);
  private readonly soundManager = inject(SoundManager);
  private readonly modelIcons = inject(ModelIcons);
  readonly collection = inject(CollectionManager);

  /** Tier lu une fois : une modale empilée par-dessus changerait `modalData`. */
  readonly tier: ChestTier = this.modalManager.modalData()?.tier ?? 'doomscroll';

  readonly phase = signal<Phase>('idle');
  readonly reward = signal<ChestReward | null>(null);
  readonly remaining = computed(() => this.collection.chestCount(this.tier));
  readonly rarityColors = RARITY_COLORS;

  readonly rewardIcon = computed(() => {
    const collectible = this.reward()?.collectible;
    return collectible ? this.modelIcons.moyaiSkin(collectible.id) : null;
  });

  readonly relicIcon = computed(() => {
    const relic = this.reward()?.relic;
    return relic ? this.modelIcons.relic(relic.id) : null;
  });

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private chest?: THREE.Group;
  private beam?: THREE.Mesh;
  private frameId?: number;
  private readonly clock = new THREE.Clock();
  private elapsed = 0;
  private phaseTime = 0;
  /** Rareté affichée pendant le défilement. */
  private shown: Rarity = 'common';
  private nextSwitch = 0;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.setup());
  }

  ngOnDestroy(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    if (this.chest) disposeObject(this.chest);
    if (this.beam) disposeObject(this.beam);
    this.renderer?.dispose();
    // Une modale s'ouvre et se ferme à chaque coffre : sans rendre le
    // contexte, le navigateur finit par refuser d'en créer.
    this.renderer?.forceContextLoss();
  }

  open(): void {
    if (this.phase() !== 'idle') return;
    this.bulk.set(null);
    const reward = this.collection.openChest(this.tier);
    if (!reward) return;

    this.reward.set(reward);
    this.phaseTime = 0;
    this.nextSwitch = 0;
    this.phase.set('rolling');
    this.soundManager.playFX(Sound.Plop);
  }

  /** Remet un coffre fermé en place pour ouvrir le suivant. */
  next(): void {
    if (this.remaining() <= 0) return;
    this.zone.runOutsideAngular(() => this.resetChest());
    this.reward.set(null);
    this.phase.set('idle');
  }

  /** Récapitulatif d'une ouverture en série, `null` hors de ce mode. */
  readonly bulk = signal<{ gems: number; collectibles: number; relics: number; aura: number; count: number } | null>(null);

  /**
   * Ouvre d'un coup tous les coffres du tier en réserve.
   *
   * Les enchaîner un par un demandait trois secondes d'animation chacun : avec
   * une dizaine en attente, on regardait défiler une minute avant de pouvoir
   * rejouer. Le récapitulatif dit ce qu'on a eu, sans rien perdre au passage.
   */
  openAll(): void {
    if (this.phase() !== 'idle' || this.remaining() <= 0) return;

    const total = { gems: 0, collectibles: 0, relics: 0, aura: 0, count: 0 };
    while (this.collection.chestCount(this.tier) > 0) {
      const reward = this.collection.openChest(this.tier);
      if (!reward) break;
      total.count++;
      total.gems += reward.gems;
      total.aura += reward.aura;
      if (reward.collectible) total.collectibles++;
      if (reward.relic) total.relics++;
    }

    this.bulk.set(total);
    this.phase.set('reveal');
    this.soundManager.playFX(Sound.Buy);
  }

  close(): void {
    this.modalManager.close();
  }

  // --- Scène -------------------------------------------------------------

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xfff4e0, 0x1a1a18, 1.2));
    const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
    key.position.set(3, 5, 4);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    this.camera.position.set(0, 1.3, 4.4);
    this.camera.lookAt(0, 0.2, 0);

    // Faisceau de lumière qui jaillit à l'ouverture : un cône ouvert, additif.
    // La pointe en bas, posée sur le coffre : le faisceau s'évase en montant.
    const beamGeometry = new THREE.ConeGeometry(0.55, 3.2, 6, 1, true);
    beamGeometry.rotateX(Math.PI);
    beamGeometry.translate(0, 1.6, 0);
    this.beam = new THREE.Mesh(
      beamGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    this.beam.position.y = 0.15;
    this.beam.visible = false;
    this.scene.add(this.beam);

    this.resetChest();
    this.resize();
    this.renderFrame();
  }

  private resetChest(): void {
    if (!this.scene) return;
    if (this.chest) {
      this.scene.remove(this.chest);
      disposeObject(this.chest);
    }
    this.chest = createChest(this.tier);
    this.chest.rotation.y = -0.5;
    this.scene.add(this.chest);
    if (this.beam) this.beam.visible = false;
    this.setRayColor('#6b665c', 0.35);
  }

  private resize(): void {
    const canvas = this.canvasRef().nativeElement;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height || !this.renderer || !this.camera) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private renderFrame = (): void => {
    this.frameId = requestAnimationFrame(this.renderFrame);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsed += delta;
    this.phaseTime += delta;

    const chest = this.chest;
    const lid = chest?.getObjectByName('lid');
    const reward = this.reward();

    switch (this.phase()) {
      case 'idle':
        if (chest) {
          chest.position.y = Math.sin(this.elapsed * 2) * 0.05;
          chest.rotation.y = -0.5 + Math.sin(this.elapsed * 0.8) * 0.12;
          chest.rotation.z = 0;
        }
        break;

      case 'rolling': {
        // Tremblement de plus en plus fort, et défilement des raretés de
        // plus en plus lent jusqu'à se poser sur celle tirée.
        const t = Math.min(1, this.phaseTime / ROLL_DURATION);
        if (chest) {
          chest.rotation.z = Math.sin(this.elapsed * 48) * 0.09 * t;
          chest.position.y = Math.abs(Math.sin(this.elapsed * 24)) * 0.06 * t;
        }
        if (reward && this.phaseTime >= this.nextSwitch) {
          const landing = t >= 0.92;
          this.shown = landing ? reward.rarity : this.nextRarity();
          this.nextSwitch = this.phaseTime + 0.05 + t * t * 0.28;
          this.setRayColor(RARITY_COLORS[this.shown], 0.55 + t * 0.4);
        }
        if (t >= 1) {
          this.phaseTime = 0;
          this.zone.run(() => this.phase.set('opening'));
          if (reward) this.burst(reward.rarity);
        }
        break;
      }

      case 'opening': {
        const t = Math.min(1, this.phaseTime / OPEN_DURATION);
        const eased = 1 - Math.pow(1 - Math.min(1, t * 2.5), 3);
        if (chest) {
          chest.rotation.z = 0;
          chest.position.y = 0;
        }
        if (lid) lid.rotation.x = -1.9 * eased;
        this.animateBeam(t, reward?.rarity);
        if (t >= 1) this.zone.run(() => this.phase.set('reveal'));
        break;
      }

      case 'reveal':
        this.animateBeam(1 + this.phaseTime, reward?.rarity);
        break;
    }

    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };

  private nextRarity(): Rarity {
    const index = RARITIES.indexOf(this.shown);
    return RARITIES[(index + 1) % RARITIES.length];
  }

  private animateBeam(t: number, rarity: Rarity | undefined): void {
    const beam = this.beam;
    if (!beam || !rarity) return;
    beam.visible = true;
    const material = beam.material as THREE.MeshBasicMaterial;
    material.color.set(RARITY_COLORS[rarity]);
    const grow = Math.min(1, t * 2);
    beam.scale.set(0.6 + grow * 0.5, grow, 0.6 + grow * 0.5);
    beam.rotation.y += 0.01;
    material.opacity = 0.55 + Math.sin(this.elapsed * 6) * 0.1;
  }

  /** Couleur et intensité des rayons tournants, posées sans détection de changements. */
  private setRayColor(color: string, strength: number): void {
    const stage = this.stageRef().nativeElement;
    stage.style.setProperty('--ray', color);
    stage.style.setProperty('--ray-strength', `${strength}`);
  }

  /** Gerbe d'éclats à l'ouverture, plus fournie selon la rareté. */
  private burst(rarity: Rarity): void {
    const stage = this.stageRef().nativeElement;
    const count = { common: 14, rare: 22, epic: 32, legendary: 48 }[rarity];
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('span');
      spark.className = 'spark';
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const distance = 90 + Math.random() * 150;
      Object.assign(spark.style, {
        background: i % 3 === 0 ? '#fff6d8' : RARITY_COLORS[rarity]
      });
      stage.appendChild(spark);
      const animation = spark.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          {
            transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0.3)`,
            opacity: 0
          }
        ],
        { duration: 700 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' }
      );
      animation.onfinish = () => spark.remove();
    }
    this.soundManager.playFX(Sound.Buy);
  }
}
