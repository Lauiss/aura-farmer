import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
  effect,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { disposeObject } from '../../three/geometry';
import { MoyaiPalette, applyMoyaiPalette, createMoyai } from '../../three/models/moyai';
import { createCursor, setCursorOpacity } from '../../three/models/cursor';
import { CosmeticId, createCosmetic } from '../../three/models/cosmetics';
import { BackgroundId, backgroundDefinition, createBackground } from '../../three/models/backgrounds';
import { createBullet, createSniper, setSniperOpacity } from '../../three/models/sniper';
import { animateWeakPoint, createWeakPoint } from '../../three/models/weak-point';
import { auraShellOpacity, createAuraShard, createAuraShell } from '../../three/models/aura';
import { createBrainrot } from '../../three/models/brainrot';
import { createMogFace, fadeMogFace } from '../../three/models/mog-face';
import { BossId, bossDefinition } from '../../../assets/static/bosses';
import { SettingsManager } from '../../services/settings-manager';

/** Réglages des points faibles, fournis par les améliorations achetées. */
export interface WeakPointConfig {
  /** Échelle du point ; 1 à l'achat. */
  size: number;
  /** Durée de présence d'un point, en secondes. */
  lifetime: number;
  /** Délai avant l'apparition du suivant, en secondes. */
  respawn: number;
}

/**
 * Scène Three.js autonome affichant la statue moyai en low poly.
 * La statue se tourne dans tous les sens à la souris ou au doigt ; elle
 * pivote doucement sur elle-même tant que l'utilisateur ne la manipule pas.
 */
@Component({
  selector: 'app-moyai-viewer',
  standalone: true,
  templateUrl: './moyai-viewer.html',
  styleUrl: './moyai-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoyaiViewer implements AfterViewInit, OnDestroy {

  /** Rotation lente automatique, en radians par seconde, quand on ne touche à rien. */
  readonly idleSpin = input(0.25);
  /** À `false`, la statue n'est plus manipulable : elle tourne seule. */
  readonly interactive = input(true);
  /** Distance de la caméra ; à réduire pour un affichage en petit. */
  readonly distance = input(5.8);
  /** Orientation de départ, en radians. Avec `idleSpin` à 0, elle ne bouge plus. */
  readonly rotation = input<[number, number, number]>([0, 0, 0]);
  /** Accessoires portés par la statue. */
  readonly cosmetics = input<readonly CosmeticId[]>([]);
  /** Décor de fond, ou `null` pour le fond uni de la page. */
  readonly background = input<BackgroundId | null>(null);
  /** Matière de la statue (skin de la collection), `null` pour la pierre. */
  readonly palette = input<MoyaiPalette | null>(null);
  /**
   * Part de l'amortissement retirée à la rotation, de 0 à 1 : plus elle est
   * haute, plus la statue tourne longtemps après avoir été lancée.
   */
  readonly inertia = input(0);
  /**
   * Rotation perpétuelle, en radians par seconde : la caméra orbite seule
   * autour de la statue, ce qui entretient le combo. 0 pour la désactiver.
   */
  readonly autoSpin = input(0);
  /** Points faibles à faire apparaître, ou `null` s'ils ne sont pas débloqués. */
  readonly weakPoints = input<WeakPointConfig | null>(null);

  /**
   * Palier d'aura atteint, de 0 (aucun halo) à 3. Au-delà du million, la
   * statue s'entoure d'une lueur qui s'intensifie à chaque palier.
   */
  readonly auraLevel = input(0);

  /**
   * Brainrot porté à la place de la statue, gagné en battle d'aura. `null`
   * pour le moyai d'origine. Les accessoires ne suivent pas : ils sont taillés
   * pour la tête de moai et se poseraient n'importe où sur une autre créature.
   */
  readonly creature = input<BossId | null>(null);

  /**
   * Images par seconde maximales. 0 laisse la scène tourner au rythme de
   * l'écran.
   *
   * Les vignettes décoratives — la statue des compteurs, la tête qui parle, le
   * marchand — tournent lentement ou pas du tout : les rendre soixante fois
   * par seconde pour trente pixels est du travail perdu, et c'est ce qui
   * faisait ramer les machines modestes, l'écran de jeu à lui seul faisant
   * vivre trois contextes WebGL.
   */
  readonly maxFps = input(0);


  /** Émis au clic sur la statue, pour l'utiliser comme cible de jeu. */
  readonly clicked = output<MouseEvent>();

  /**
   * Rapport de rotation, appelé à chaque image avec le chemin parcouru depuis
   * la précédente. C'est un simple rappel et non une sortie Angular : à
   * soixante images par seconde, une sortie relancerait la détection de
   * changements en continu.
   */
  readonly spinReporter = input<((yaw: number, pitch: number, dt: number) => void) | null>(null);

  /**
   * Signale, image par image, si la statue nous tourne le dos. Même raison
   * qu'au-dessus : un rappel plutôt qu'une sortie Angular.
   */
  readonly backFacingReporter = input<((backFacing: boolean, dt: number) => void) | null>(null);

  /**
   * Signale un point faible éteint sans avoir été touché, pour que la série
   * en cours retombe. Rappel plutôt que sortie, comme les deux précédents :
   * il part de la boucle de rendu, hors de la zone Angular.
   */
  readonly weakPointMissedReporter = input<(() => void) | null>(null);

  /**
   * Une statue manipulable reçoit un `click` à la fin de chaque rotation à la
   * souris. Sans ce filtre, faire tourner le moyai rapporterait de l'aura.
   */
  onPointerDown(event: PointerEvent): void {
    this.pointerDownAt = { x: event.clientX, y: event.clientY };
  }

  onClick(event: MouseEvent): void {
    const start = this.pointerDownAt;
    this.pointerDownAt = null;
    if (start) {
      const travel = Math.abs(event.clientX - start.x) + Math.abs(event.clientY - start.y);
      if (travel > 5) return;
    }
    this.clicked.emit(event);
  }

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly settings = inject(SettingsManager);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  /**
   * Scène et caméra du décor, distinctes de celles de la statue.
   *
   * Ce sont les commandes qui font orbiter la **caméra** autour du moyai : un
   * décor posé dans la même scène tournerait donc avec lui. Le rendre à part,
   * avec une caméra fixe, le laisse immobile.
   */
  private backgroundScene?: THREE.Scene;
  private backgroundCamera?: THREE.PerspectiveCamera;
  private backgroundGroup?: THREE.Group;
  private camera?: THREE.PerspectiveCamera;
  private controls?: TrackballControls;
  private moyai?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private frameId?: number;
  private readonly clock = new THREE.Clock();
  /** Orientation de la caméra à l'image précédente, pour mesurer la rotation. */
  private readonly previousDirection = new THREE.Vector3();
  private readonly currentDirection = new THREE.Vector3();

  /** Curseur du geste de mewing. Créé au premier appel, puis réutilisé. */
  private shush?: THREE.Group;
  private shushElapsed = 0;

  /** Trickshot : l'arme, sa balle, et l'avancement de la séquence. */
  private sniper?: THREE.Group;
  private bullet?: THREE.Mesh;
  private trickshotElapsed = 0;
  /** Départ et cible du tir, figés au déclenchement d'après la caméra. */
  private readonly shotFrom = new THREE.Vector3();
  private readonly shotTo = new THREE.Vector3();

  /** Rebond de la statue au clic : temps écoulé et côté cliqué (-1 à 1). */
  private bounceElapsed = -1;
  private bounceSide = 0;

  /** Accessoires actuellement greffés, par identifiant. */
  private readonly worn = new Map<CosmeticId, THREE.Group>();

  /**
   * Point faible, enfant de la statue pour la suivre. Il alterne entre une
   * absence (`hidden`), une présence limitée (`visible`) et un bref éclat quand
   * on le touche (`popping`).
   */
  private weakPoint?: THREE.Group;
  private weakState: 'hidden' | 'visible' | 'popping' = 'hidden';

  /**
   * Éclats d'aura projetés au clic. Le lot est alloué une fois et recyclé :
   * créer des maillages à chaque clic ferait travailler le ramasse-miettes en
   * plein milieu du geste le plus répété du jeu.
   */
  private readonly shards: THREE.Mesh[] = [];
  private readonly shardVelocity: THREE.Vector3[] = [];
  private readonly shardSpin: THREE.Vector3[] = [];
  private readonly shardLife: number[] = [];
  private nextShard = 0;

  /** Expression de mogger, jouée au clic quand le Mogging est débloqué. */
  private mogFace?: THREE.Group;
  private mogElapsed = -1;

  /** Halo autour de la statue, monté dès qu'un palier d'aura est atteint. */
  private auraShell?: THREE.Group;
  private auraElapsed = 0;
  private weakTimer = 0;
  private weakAge = 0;
  /** Maillages de la tête seule, sur lesquels les points faibles se posent. */
  private readonly headMeshes: THREE.Object3D[] = [];
  private readonly raycaster = new THREE.Raycaster();

  constructor() {
    // La scène n'existe qu'après le premier rendu : l'effet se contente de
    // sortir tant que la statue n'est pas prête, et repassera au changement
    // suivant de la liste.
    effect(() => {
      const wanted = this.cosmetics();
      const creature = this.creature();
      this.zone.runOutsideAngular(() => this.syncCosmetics(creature ? [] : wanted));
    });

    // Le cadrage suit la distance demandée : un buste habillé descend plus bas
    // que la tête seule et serait coupé sans recul.
    effect(() => {
      const distance = this.distance();
      if (this.camera) this.camera.position.z = distance;
    });

    effect(() => {
      const damping = MoyaiViewer.dampingFor(this.inertia());
      if (this.controls) this.controls.dynamicDampingFactor = damping;
    });

    effect(() => {
      const palette = this.palette();
      // Un brainrot n'a pas les matériaux nommés de la statue : la palette de
      // la collection ne le concerne pas.
      if (this.moyai && !this.creature()) applyMoyaiPalette(this.moyai, palette);
    });

    effect(() => {
      const id = this.background();
      this.zone.runOutsideAngular(() => this.syncBackground(id));
    });

    // Passer en économie en cours de partie baisse la densité tout de suite ;
    // l'anticrénelage, lui, ne se choisit qu'à la création du contexte.
    effect(() => {
      this.settings.graphics();
      this.zone.runOutsideAngular(() => {
        if (!this.renderer) return;
        this.renderer.setPixelRatio(this.settings.pixelRatio(this.maxPixelRatio()));
        this.resize();
      });
    });

    effect(() => {
      const level = this.auraLevel();
      this.zone.runOutsideAngular(() => this.syncAura(level));
    });

    effect(() => {
      // Lu pour la dépendance : la créature portée change, le sujet aussi.
      this.creature();
      this.zone.runOutsideAngular(() => {
        if (this.moyai) this.swapSubject();
      });
    });
  }
  private userInteracted = false;
  /** Position du pointeur à l'appui, pour distinguer un clic d'une rotation. */
  private pointerDownAt: { x: number; y: number } | null = null;

  ngAfterViewInit(): void {
    // Toute la boucle de rendu vit hors d'Angular : aucun cycle de détection
    // de changements ne doit être déclenché à 60 images par seconde.
    this.zone.runOutsideAngular(() => this.setup());
  }

  ngOnDestroy(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    if (this.moyai) disposeObject(this.moyai);
    if (this.sniper) disposeObject(this.sniper);
    if (this.bullet) disposeObject(this.bullet);
    if (this.backgroundGroup) disposeObject(this.backgroundGroup);
    if (this.weakPoint) disposeObject(this.weakPoint);
    if (this.auraShell) disposeObject(this.auraShell);
    for (const shard of this.shards) disposeObject(shard);
    this.renderer?.dispose();
    // Le composant d'indication est monté et démonté à répétition : sans
    // rendre explicitement le contexte, le navigateur finit par refuser d'en
    // ouvrir de nouveaux.
    this.renderer?.forceContextLoss();
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    const container = this.host.nativeElement as HTMLElement;

    const eco = this.settings.isEco();
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !eco,
      alpha: true,
      powerPreference: eco ? 'low-power' : 'default'
    });
    this.renderer.setPixelRatio(this.settings.pixelRatio(this.maxPixelRatio()));

    this.scene = new THREE.Scene();

    this.backgroundScene = new THREE.Scene();
    this.backgroundCamera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    this.backgroundCamera.position.set(0, 1.5, 16);
    this.backgroundCamera.lookAt(0, 0, -10);
    this.backgroundScene.add(new THREE.HemisphereLight(0xcfd8e4, 0x14181e, 1.5));
    const backgroundKey = new THREE.DirectionalLight(0xffe9d2, 1.1);
    backgroundKey.position.set(-6, 8, 4);
    this.backgroundScene.add(backgroundKey);
    this.syncBackground(this.background());

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.1, this.distance());

    this.buildSubject();
    // Comme le décor et les accessoires : l'effet qui suit `auraLevel` s'est
    // déjà exécuté avant que la scène n'existe et n'a rien pu poser. Sans cet
    // appel, arriver sur l'écran avec un million d'aura n'allumait aucun halo
    // tant que le palier ne changeait pas.
    this.syncAura(this.auraLevel());

    this.addLights(this.scene);

    if (this.interactive()) this.setupControls(canvas);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.renderFrame();
  }

  /**
   * Monte le sujet de la scène : la statue, ou le brainrot gagné en battle.
   *
   * Les maillages sont relevés **avant** la pose des accessoires : un point
   * faible se pose sur la pierre, jamais sur des lunettes.
   */
  private buildSubject(): void {
    if (!this.scene) return;

    const id = this.creature();
    const subject = id ? createBrainrot(bossDefinition(id)) : createMoyai({ palette: this.palette() ?? undefined });

    subject.rotation.set(...this.rotation());
    this.scene.add(subject);
    this.moyai = subject;

    this.headMeshes.length = 0;
    subject.traverse(child => {
      if ((child as THREE.Mesh).isMesh) this.headMeshes.push(child);
    });

    // Les accessoires sont modelés pour la tête de moai : sur un brainrot ils
    // flotteraient à côté. Ils ne se posent donc que sur la statue.
    if (!id) this.syncCosmetics(this.cosmetics());
  }

  /**
   * Remplace le sujet sans reconstruire la scène. Tout ce qui lui était
   * greffé — accessoires, point faible, curseur du mewing — part avec lui et
   * sera reposé à la demande.
   */
  private swapSubject(): void {
    if (!this.scene || !this.moyai) return;

    this.scene.remove(this.moyai);
    disposeObject(this.moyai);
    this.worn.clear();
    // Ces deux-là étaient enfants du sujet : ils viennent d'être libérés avec
    // lui, et doivent être oubliés sous peine de double libération.
    this.weakPoint = undefined;
    this.weakState = 'hidden';
    this.shush = undefined;
    this.mogFace = undefined;
    this.mogElapsed = -1;

    this.buildSubject();
  }

  /**
   * Une vignette décorative n'a pas besoin de la pleine densité de l'écran :
   * à 2x, un canevas de trente pixels en dessine quatre fois trop.
   */
  private maxPixelRatio(): number {
    return this.interactive() ? 2 : 1.25;
  }

  /** Amortissement de base, réduit par l'inertie achetée. */
  private static dampingFor(inertia: number): number {
    return Math.max(0.0035, 0.035 * (1 - inertia));
  }

  private setupControls(canvas: HTMLCanvasElement): void {
    this.controls = new TrackballControls(this.camera!, canvas);
    this.controls.noPan = true;
    this.controls.rotateSpeed = 3.4;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 10;
    // Inertie franche : lancée d'un geste, la statue continue longtemps avant
    // de s'immobiliser. C'est ce qui rend les enchaînements possibles.
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = MoyaiViewer.dampingFor(this.inertia());
    this.controls.addEventListener('start', () => (this.userInteracted = true));
  }

  /**
   * Mesure la rotation parcourue depuis l'image précédente et la transmet.
   * Le lacet et le tangage sont séparés pour qu'un tour horizontal et un tour
   * vertical se comptent indépendamment.
   */
  private reportSpin(delta: number): void {
    const report = this.spinReporter();
    if (!report || !this.camera) return;

    this.camera.getWorldDirection(this.currentDirection);

    if (this.previousDirection.lengthSq() > 0) {
      const previousYaw = Math.atan2(this.previousDirection.x, this.previousDirection.z);
      const currentYaw = Math.atan2(this.currentDirection.x, this.currentDirection.z);
      let yaw = currentYaw - previousYaw;
      // Repli sur l'intervalle [-π, π] : sans ça, le passage par ±π
      // compterait comme un demi-tour instantané.
      if (yaw > Math.PI) yaw -= Math.PI * 2;
      if (yaw < -Math.PI) yaw += Math.PI * 2;

      const pitch =
        Math.asin(THREE.MathUtils.clamp(this.currentDirection.y, -1, 1)) -
        Math.asin(THREE.MathUtils.clamp(this.previousDirection.y, -1, 1));

      report(yaw, pitch, delta);
    }

    this.previousDirection.copy(this.currentDirection);
  }

  /**
   * La statue regarde vers +Z. La caméra la voit de dos lorsqu'elle se place
   * derrière, c'est-à-dire quand sa direction de visée pointe vers +Z.
   */
  private reportBackFacing(delta: number): void {
    const report = this.backFacingReporter();
    if (!report || !this.camera) return;

    this.camera.getWorldDirection(this.currentDirection);
    report(this.currentDirection.z > 0.35, delta);
  }

  /**
   * Joue le geste du mewing : l'index se dresse devant la bouche, tient la
   * pose, puis file le long de la mâchoire avant de s'effacer.
   *
   * Le doigt est enfant de la statue, donc il la suit si elle tourne.
   */
  playShush(): void {
    if (!this.moyai) return;

    if (!this.shush) {
      this.shush = createCursor();
      this.shush.scale.setScalar(0.55);
      this.moyai.add(this.shush);
    }

    this.shushElapsed = 0;
    this.shush.visible = true;
  }

  /**
   * Trajet du geste, dans le repère de la statue recentrée. Une simple
   * interpolation entre deux points coupait au travers du menton : la mâchoire
   * n'est pas une droite, elle part de l'avant du visage, contourne le menton
   * et remonte vers l'oreille. Les points suivent ce contour, décalés vers
   * l'extérieur pour que le doigt effleure la pierre sans y entrer.
   */
  private static readonly SHUSH_PATH = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(0.88, -0.48, -0.08), // sous l'oreille
      new THREE.Vector3(0.78, -0.58, 0.26), // le long de la mâchoire
      new THREE.Vector3(0.58, -0.6, 0.62), // coin du menton
      new THREE.Vector3(0.38, -0.44, 0.86), // remontée vers la bouche
      new THREE.Vector3(0.26, -0.18, 1.0) // devant les lèvres
    ],
    false,
    'catmullrom',
    0.4
  );

  /** Position du « chut », devant les lèvres : la fin du tracé. */
  private static readonly SHUSH_POSE = new THREE.Vector3(0.26, -0.18, 1.0);
  private static readonly SHUSH_DURATION = 1.45;

  /** Le tir part de loin, en haut à droite, et vise le front de la statue. */
  private static readonly TRICKSHOT_DURATION = 1.6;
  private static readonly BOUNCE_DURATION = 0.42;

  private animateShush(delta: number): void {
    const finger = this.shush;
    if (!finger || !finger.visible) return;

    this.shushElapsed += delta;
    const t = this.shushElapsed / MoyaiViewer.SHUSH_DURATION;

    if (t >= 1) {
      finger.visible = false;
      return;
    }

    // Deux temps, et non un seul mouvement continu. D'abord le « chut » tenu
    // devant les lèvres ; puis le tracé de la mâchoire, qui part **de
    // l'oreille et revient vers le menton** — il le parcourait à l'envers, du
    // menton vers l'oreille, ce qui ne ressemblait pas au geste.
    //
    // Le doigt s'efface entre les deux : sans cette coupure il lui faudrait
    // traverser tout le visage pour rejoindre son point de départ.
    const SHUSH_END = 0.36;
    const SLIDE_START = 0.48;

    let opacity: number;
    if (t < SHUSH_END) {
      finger.position.copy(MoyaiViewer.SHUSH_POSE);
      finger.rotation.set(0, 0, 0);
      opacity = THREE.MathUtils.clamp(t / 0.1, 0, 1) * THREE.MathUtils.clamp((SHUSH_END - t) / 0.1, 0, 1);
    } else if (t < SLIDE_START) {
      // Temps mort : le doigt est effacé, il se replace sans se voir.
      opacity = 0;
    } else {
      const slide = THREE.MathUtils.clamp((t - SLIDE_START) / 0.4, 0, 1);
      // Adoucissement aux deux bouts, pour que le doigt ne parte pas d'un coup.
      const eased = slide * slide * (3 - 2 * slide);
      MoyaiViewer.SHUSH_PATH.getPointAt(eased, finger.position);
      // Il se redresse en avançant vers le menton, au lieu de rester couché.
      finger.rotation.set(0, (1 - eased) * 0.7, -(1 - eased) * 1.15);
      opacity =
        THREE.MathUtils.clamp((t - SLIDE_START) / 0.1, 0, 1) *
        THREE.MathUtils.clamp((1 - t) / 0.18, 0, 1);
    }

    setCursorOpacity(finger, opacity);
  }

  // --- Points faibles ------------------------------------------------------

  /**
   * Vrai si le clic touche le point faible affiché. Le point éclate alors, et
   * le suivant apparaîtra ailleurs après le délai prévu.
   */
  tryHitWeakPoint(event: MouseEvent): boolean {
    const point = this.weakPoint;
    const hitZone = point?.getObjectByName('hit');
    if (!hitZone || this.weakState !== 'visible' || !this.camera) return false;

    const rect = this.canvasRef().nativeElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(pointer, this.camera);

    const zoneHit = this.raycaster.intersectObject(hitZone, false)[0];
    if (!zoneHit) return false;

    // Un point caché derrière la tête ne se touche pas au travers de la pierre.
    const stoneHit = this.raycaster.intersectObjects(this.headMeshes, false)[0];
    if (stoneHit && stoneHit.distance < zoneHit.distance - 0.25) return false;

    this.weakState = 'popping';
    this.weakTimer = MoyaiViewer.WEAK_POP_DURATION;
    return true;
  }

  private static readonly WEAK_POP_DURATION = 0.28;

  private updateWeakPoint(delta: number): void {
    const config = this.weakPoints();

    if (!config) {
      if (this.weakPoint) this.weakPoint.visible = false;
      this.weakState = 'hidden';
      return;
    }
    if (!this.moyai) return;

    if (!this.weakPoint) {
      this.weakPoint = createWeakPoint();
      this.weakPoint.visible = false;
      this.moyai.add(this.weakPoint);
      this.weakTimer = 0.8;
    }
    const point = this.weakPoint;
    this.weakTimer -= delta;
    this.weakAge += delta;

    switch (this.weakState) {
      case 'hidden':
        if (this.weakTimer <= 0 && this.placeWeakPoint(point)) {
          this.weakState = 'visible';
          this.weakTimer = config.lifetime;
          this.weakAge = 0;
          point.visible = true;
        }
        break;

      case 'visible': {
        // Apparition franche, puis un clignotement dans la dernière
        // demi-seconde pour prévenir qu'il va filer.
        const appear = Math.min(1, this.weakAge / 0.15);
        const closing = this.weakTimer < 0.5 && Math.sin(this.weakAge * 40) < 0;
        point.scale.setScalar(config.size * appear);
        animateWeakPoint(point, this.weakAge, closing ? 0.35 : 1);
        // Éteint sans avoir été touché : la série en cours est perdue.
        if (this.weakTimer <= 0) this.hideWeakPoint(config, true);
        break;
      }

      case 'popping': {
        const t = 1 - Math.max(0, this.weakTimer) / MoyaiViewer.WEAK_POP_DURATION;
        point.scale.setScalar(config.size * (1 + t * 1.6));
        animateWeakPoint(point, this.weakAge, 1 - t);
        if (this.weakTimer <= 0) this.hideWeakPoint(config, false);
        break;
      }
    }
  }

  private hideWeakPoint(config: WeakPointConfig, missed: boolean): void {
    if (this.weakPoint) this.weakPoint.visible = false;
    this.weakState = 'hidden';
    this.weakTimer = config.respawn;
    if (missed) this.weakPointMissedReporter()?.();
  }

  /**
   * Choisit un endroit de la tête et y pose le point, à plat sur la facette.
   * Le plus souvent du côté de la caméra, parfois ailleurs : il faut alors
   * tourner la statue pour le trouver.
   */
  private placeWeakPoint(point: THREE.Group): boolean {
    const moyai = this.moyai;
    if (!moyai || !this.camera) return false;
    moyai.updateMatrixWorld(true);

    const center = new THREE.Vector3();
    moyai.getWorldPosition(center);
    const towardCamera = this.camera.position.clone().sub(center).normalize();
    const blockers = [...this.headMeshes, ...this.worn.values()];

    for (let attempt = 0; attempt < 12; attempt++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.6 - 0.8,
        Math.random() * 2 - 1
      ).normalize();
      if (Math.random() < 0.7) direction.add(towardCamera.clone().multiplyScalar(1.4)).normalize();

      const origin = center.clone().add(direction.clone().multiplyScalar(4));
      this.raycaster.set(origin, direction.clone().negate());
      const hit = this.raycaster.intersectObjects(blockers, true)[0];
      // Un accessoire au premier plan masquerait le point : on retente.
      if (!hit?.face || !this.headMeshes.includes(hit.object)) continue;

      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const inverse = moyai.matrixWorld.clone().invert();
      const localPoint = hit.point.clone().add(normal.clone().multiplyScalar(0.03)).applyMatrix4(inverse);
      const localNormal = normal.transformDirection(inverse);

      point.position.copy(localPoint);
      point.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);
      return true;
    }
    return false;
  }

  /** Ajoute et retire les accessoires pour coller à la liste demandée. */
  private syncCosmetics(wanted: readonly CosmeticId[]): void {
    if (!this.moyai) return;

    for (const [id, group] of this.worn) {
      if (wanted.includes(id)) continue;
      this.moyai.remove(group);
      disposeObject(group);
      this.worn.delete(id);
    }

    for (const id of wanted) {
      if (this.worn.has(id)) continue;
      const piece = createCosmetic(id);
      if (!piece) continue;
      this.moyai.add(piece);
      this.worn.set(id, piece);
    }
  }

  /** Installe ou retire le décor de fond. */
  private syncBackground(id: BackgroundId | null): void {
    if (!this.backgroundScene) return;

    if (this.backgroundGroup) {
      this.backgroundScene.remove(this.backgroundGroup);
      disposeObject(this.backgroundGroup);
      this.backgroundGroup = undefined;
    }

    this.backgroundScene.background = null;
    if (!id) return;

    // La couleur du ciel est posée sur la scène en plus du plan peint : quel
    // que soit le format de l'écran, aucun bord ne peut rester vide.
    this.backgroundScene.background = new THREE.Color(backgroundDefinition(id).sky);
    this.backgroundGroup = createBackground(id);
    this.backgroundScene.add(this.backgroundGroup);
  }

  /**
   * Joue le trickshot : le fusil apparaît en hauteur, la balle file vers le
   * front de la statue, puis tout s'efface.
   */
  playTrickshot(): void {
    if (!this.scene || !this.camera) return;

    if (!this.sniper) {
      this.sniper = createSniper();
      // Tenu par la statue : à son échelle, pas à celle d'un tireur lointain.
      this.sniper.scale.setScalar(0.5);
      this.bullet = createBullet();
      this.scene.add(this.sniper);
      this.scene.add(this.bullet);
    }

    // **C'est la statue qui tire.** Le fusil part de son épaule et la balle
    // s'en va au loin, dans une direction tirée au sort. Le tireur extérieur
    // de la version précédente donnait l'impression qu'on canardait le moyai,
    // alors que le trickshot est censé être une prouesse de sa part.
    //
    // L'épaule se calcule par rapport à la caméra : c'est elle qui orbite, et
    // une arme posée à un point fixe du monde sortait du cadre dès qu'on avait
    // tourné la statue.
    const camera = this.camera;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const toward = camera.position.clone().normalize();

    // Départ : devant l'épaule, du côté tiré au sort.
    const side = Math.random() < 0.5 ? -1 : 1;
    this.shotFrom
      .set(0, -0.15, 0)
      .addScaledVector(right, side * 0.95)
      .addScaledVector(toward, 0.75);

    // Cible : un point lointain, dans une direction quelconque mais toujours
    // vers l'avant de l'écran, sinon la balle part derrière la tête et ne se
    // voit pas.
    const spread = (Math.random() - 0.5) * 1.6;
    const rise = 0.3 + Math.random() * 1.4;
    this.shotTo
      .copy(this.shotFrom)
      .addScaledVector(right, side * 2.4 + spread)
      .addScaledVector(up, rise)
      .addScaledVector(toward, 3.4);

    this.trickshotElapsed = 0;
    this.sniper.visible = true;
    if (this.bullet) this.bullet.visible = true;
  }

  private animateTrickshot(delta: number): void {
    const sniper = this.sniper;
    const bullet = this.bullet;
    if (!sniper?.visible || !bullet) return;

    this.trickshotElapsed += delta;
    const t = this.trickshotElapsed / MoyaiViewer.TRICKSHOT_DURATION;

    if (t >= 1) {
      sniper.visible = false;
      bullet.visible = false;
      return;
    }

    const from = this.shotFrom;
    const to = this.shotTo;

    // L'arme reste en place, orientée vers la cible.
    sniper.position.copy(from);
    sniper.lookAt(to);
    // `lookAt` aligne l'axe -Z ; le canon est selon +X, d'où le quart de tour.
    sniper.rotateY(-Math.PI / 2);

    // La balle ne part qu'après un temps de visée.
    const flight = THREE.MathUtils.clamp((t - 0.35) / 0.3, 0, 1);
    bullet.visible = flight > 0 && flight < 1;
    if (bullet.visible) {
      bullet.position.lerpVectors(from, to, flight);
      bullet.lookAt(to);
    }

    const fadeIn = THREE.MathUtils.clamp(t / 0.08, 0, 1);
    const fadeOut = THREE.MathUtils.clamp((1 - t) / 0.2, 0, 1);
    setSniperOpacity(sniper, Math.min(fadeIn, fadeOut));
  }

  /**
   * Rotation perpétuelle : la caméra orbite autour de la statue selon son
   * propre axe vertical. C'est la caméra qui tourne, comme quand on manipule
   * la statue à la main : le combo la mesure donc de la même façon.
   */
  private orbit(delta: number): void {
    const speed = this.autoSpin();
    if (!speed || !this.camera) return;
    this.camera.position.applyAxisAngle(this.camera.up, speed * delta);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * Rebond de la statue au clic, incliné du côté cliqué. Il est joué dans la
   * scène et non en CSS sur le canvas : animer le canvas faisait rebondir le
   * décor de fond avec la statue.
   */
  bounce(side: number): void {
    this.bounceSide = THREE.MathUtils.clamp(side, -1, 1);
    this.bounceElapsed = 0;
  }

  private animateBounce(delta: number): void {
    const moyai = this.moyai;
    if (!moyai || this.bounceElapsed < 0) return;

    this.bounceElapsed += delta;
    const t = this.bounceElapsed / MoyaiViewer.BOUNCE_DURATION;
    if (t >= 1) {
      moyai.scale.set(1, 1, 1);
      moyai.rotation.z = 0;
      this.bounceElapsed = -1;
      return;
    }

    // Écrasement, étirement, puis retour amorti : la même courbe que l'ancien
    // rebond CSS, en plus doux dans l'axe de la profondeur.
    const reduced = MoyaiViewer.reducedMotion;
    const squash = Math.sin(t * Math.PI * 3) * Math.pow(1 - t, 1.6) * (reduced ? 0.02 : 0.12);
    moyai.scale.set(1 + squash, 1 - squash, 1 + squash * 0.5);
    moyai.rotation.z = reduced ? 0 : -this.bounceSide * 0.07 * Math.sin(t * Math.PI * 2) * (1 - t);
  }

  private static readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Aura ----------------------------------------------------------------

  private static readonly MOG_DURATION = 0.75;

  /**
   * Fait prendre à la statue sa tête de mogger. L'expression est greffée sur
   * elle, donc elle la suit si on la tourne, et ne vit que le temps du clic.
   */
  playMog(): void {
    if (!this.moyai) return;

    if (!this.mogFace) {
      this.mogFace = createMogFace();
      this.moyai.add(this.mogFace);
    }
    this.mogElapsed = 0;
    this.mogFace.visible = true;
  }

  private animateMog(delta: number): void {
    const face = this.mogFace;
    if (!face?.visible || this.mogElapsed < 0) return;

    this.mogElapsed += delta;
    const t = this.mogElapsed / MoyaiViewer.MOG_DURATION;
    if (t >= 1) {
      face.visible = false;
      this.mogElapsed = -1;
      return;
    }
    fadeMogFace(face, t);
  }

  /** Nombre d'éclats gardés en réserve : au-delà, les plus anciens repartent. */
  private static readonly SHARD_POOL = 28;
  private static readonly SHARD_LIFE = 0.85;

  /**
   * Projette une volée d'éclats depuis la statue : c'est l'aura qui se crée
   * sous le clic. `power` vaut 1 pour un clic ordinaire et davantage pour un
   * coup critique, ce qui élargit la volée et l'envoie plus loin.
   */
  emitAura(power = 1): void {
    if (!this.scene) return;

    const count = Math.round(THREE.MathUtils.clamp(5 * power, 4, 14));
    for (let i = 0; i < count; i++) {
      const index = this.nextShard % MoyaiViewer.SHARD_POOL;
      this.nextShard++;

      let shard = this.shards[index];
      if (!shard) {
        shard = createAuraShard();
        this.shards[index] = shard;
        this.shardVelocity[index] = new THREE.Vector3();
        this.shardSpin[index] = new THREE.Vector3();
        this.scene.add(shard);
      }

      // Départ réparti sur la surface de la tête plutôt qu'en son centre :
      // les éclats semblent sortir de la pierre et non la traverser.
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      shard.position.copy(direction).multiplyScalar(1.2 + Math.random() * 0.4);
      shard.scale.setScalar(0.7 + Math.random() * 0.6 * power);
      shard.visible = true;

      this.shardVelocity[index]
        .copy(direction)
        .multiplyScalar((2.2 + Math.random() * 1.8) * Math.min(power, 2));
      // Une poussée vers le haut : l'aura monte, elle ne se disperse pas à plat.
      this.shardVelocity[index].y += 1.1;
      this.shardSpin[index].set(
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 9
      );
      this.shardLife[index] = MoyaiViewer.SHARD_LIFE;
    }
  }

  private animateShards(delta: number): void {
    for (let i = 0; i < this.shards.length; i++) {
      const shard = this.shards[i];
      if (!shard?.visible) continue;

      this.shardLife[i] -= delta;
      if (this.shardLife[i] <= 0) {
        shard.visible = false;
        continue;
      }

      const velocity = this.shardVelocity[i];
      shard.position.addScaledVector(velocity, delta);
      // Freinage progressif : l'éclat ralentit en s'éloignant au lieu de
      // filer indéfiniment hors du cadre.
      velocity.multiplyScalar(Math.max(0, 1 - 2.4 * delta));

      const spin = this.shardSpin[i];
      shard.rotation.x += spin.x * delta;
      shard.rotation.y += spin.y * delta;
      shard.rotation.z += spin.z * delta;

      const remaining = this.shardLife[i] / MoyaiViewer.SHARD_LIFE;
      (shard.material as THREE.Material).opacity = remaining * remaining;
    }
  }

  /** Monte ou retire le halo, et règle son intensité sur le palier atteint. */
  private syncAura(level: number): void {
    if (level <= 0) {
      if (this.auraShell) this.auraShell.visible = false;
      return;
    }
    if (!this.scene) return;

    if (!this.auraShell) {
      this.auraShell = createAuraShell();
      this.scene.add(this.auraShell);
    }
    this.auraShell.visible = true;

    const opacity = auraShellOpacity(level);
    this.auraShell.children.forEach((shell, index) => {
      ((shell as THREE.Mesh).material as THREE.Material).opacity = opacity[index] ?? 0;
    });
  }

  private animateAura(delta: number): void {
    const shell = this.auraShell;
    if (!shell?.visible) return;

    this.auraElapsed += delta;
    // Les deux coques tournent en sens inverse : leurs facettes se croisent et
    // le halo scintille sans qu'on touche aux matériaux.
    shell.children[0].rotation.y += delta * 0.22;
    shell.children[0].rotation.x += delta * 0.11;
    shell.children[1].rotation.y -= delta * 0.16;
    shell.children[1].rotation.z += delta * 0.09;

    // Respiration lente, pour que le halo vive sans attirer l'oeil.
    shell.scale.setScalar(1 + Math.sin(this.auraElapsed * 1.4) * 0.03);
  }

  private addLights(scene: THREE.Scene): void {
    // Sur fond noir, l'éclairage doit à la fois sculpter les facettes et
    // détacher la silhouette : une clé chaude, un remplissage froid discret et
    // un contre-jour qui dessine le contour.
    scene.add(new THREE.HemisphereLight(0xdfe4ea, 0x1a1a18, 0.9));

    const key = new THREE.DirectionalLight(0xfff1dd, 2.2);
    key.position.set(4, 5, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x9fb4c8, 0.6);
    fill.position.set(-6, 0, 3);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(-3, 3, -7);
    scene.add(rim);
  }

  private resize(): void {
    const container = this.host.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height || !this.renderer || !this.camera) return;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    if (this.backgroundCamera) {
      this.backgroundCamera.aspect = width / height;
      this.backgroundCamera.updateProjectionMatrix();
    }
    this.controls?.handleResize();
  }

  /** Temps accumulé depuis la dernière image rendue, pour le plafond d'images. */
  private sinceRender = 0;

  private renderFrame = (): void => {
    this.frameId = requestAnimationFrame(this.renderFrame);

    const delta = this.clock.getDelta();

    // Onglet caché : le navigateur ralentit déjà `requestAnimationFrame`, mais
    // rien ne garantit qu'il l'arrête. Inutile de peindre ce que personne ne
    // regarde.
    if (document.hidden) return;

    // Plafond d'images : on laisse le temps s'écouler mais on saute le rendu.
    // Les animations restent justes, elles se fondent sur `delta`.
    const fps = this.settings.frameCap(this.maxFps());
    if (fps > 0) {
      this.sinceRender += delta;
      if (this.sinceRender < 1 / fps) return;
      this.sinceRender = 0;
    }
    if (!this.userInteracted && this.moyai) {
      this.moyai.rotation.y += this.idleSpin() * delta;
    }

    this.orbit(delta);
    this.controls?.update();
    this.reportSpin(delta);
    this.animateShush(delta);
    this.animateTrickshot(delta);
    this.updateWeakPoint(delta);
    this.animateShards(delta);
    this.animateMog(delta);
    this.animateAura(delta);
    this.animateBounce(delta);
    this.reportBackFacing(delta);
    if (!this.renderer || !this.scene || !this.camera) return;

    if (this.backgroundGroup && this.backgroundScene && this.backgroundCamera) {
      // Le décor est peint d'abord, puis la profondeur est remise à zéro pour
      // que la statue se dessine devant quelle que soit sa distance.
      this.renderer.autoClear = false;
      this.renderer.clear();
      this.renderer.render(this.backgroundScene, this.backgroundCamera);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
    } else {
      this.renderer.autoClear = true;
      this.renderer.render(this.scene, this.camera);
    }
  };
}
