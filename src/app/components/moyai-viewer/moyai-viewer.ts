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
import { BackgroundId, createBackground } from '../../three/models/backgrounds';
import { createBullet, createSniper, setSniperOpacity } from '../../three/models/sniper';
import { animateWeakPoint, createWeakPoint } from '../../three/models/weak-point';

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
      this.zone.runOutsideAngular(() => this.syncCosmetics(wanted));
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
      if (this.moyai) applyMoyaiPalette(this.moyai, palette);
    });

    effect(() => {
      const id = this.background();
      this.zone.runOutsideAngular(() => this.syncBackground(id));
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
    this.renderer?.dispose();
    // Le composant d'indication est monté et démonté à répétition : sans
    // rendre explicitement le contexte, le navigateur finit par refuser d'en
    // ouvrir de nouveaux.
    this.renderer?.forceContextLoss();
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;
    const container = this.host.nativeElement as HTMLElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

    this.moyai = createMoyai({ palette: this.palette() ?? undefined });
    this.moyai.rotation.set(...this.rotation());
    this.scene.add(this.moyai);
    // Relevés avant la pose des accessoires : un point faible se pose sur la
    // pierre, jamais sur des lunettes.
    this.moyai.traverse(child => {
      if ((child as THREE.Mesh).isMesh) this.headMeshes.push(child);
    });
    this.syncCosmetics(this.cosmetics());

    this.addLights(this.scene);

    if (this.interactive()) this.setupControls(canvas);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.renderFrame();
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
      new THREE.Vector3(0.26, -0.18, 1.0), // devant les lèvres
      new THREE.Vector3(0.38, -0.44, 0.86), // amorce de la descente
      new THREE.Vector3(0.58, -0.6, 0.62), // coin du menton
      new THREE.Vector3(0.78, -0.58, 0.26), // le long de la mâchoire
      new THREE.Vector3(0.88, -0.48, -0.08) // sous l'oreille
    ],
    false,
    'catmullrom',
    0.4
  );
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

    // Apparition, pose tenue, glissé le long de la mâchoire, effacement.
    const slide = THREE.MathUtils.clamp((t - 0.38) / 0.42, 0, 1);
    // Adoucissement aux deux bouts, pour que le doigt ne parte pas d'un coup.
    const eased = slide * slide * (3 - 2 * slide);

    MoyaiViewer.SHUSH_PATH.getPointAt(eased, finger.position);
    // Le doigt s'incline et se tourne vers la tempe au fil du glissé, au lieu
    // de rester dressé comme au moment du « chut ».
    finger.rotation.set(0, eased * 0.7, -eased * 1.15);

    const fadeIn = THREE.MathUtils.clamp(t / 0.1, 0, 1);
    const fadeOut = THREE.MathUtils.clamp((1 - t) / 0.18, 0, 1);
    setCursorOpacity(finger, Math.min(fadeIn, fadeOut));
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
        if (this.weakTimer <= 0) this.hideWeakPoint(config);
        break;
      }

      case 'popping': {
        const t = 1 - Math.max(0, this.weakTimer) / MoyaiViewer.WEAK_POP_DURATION;
        point.scale.setScalar(config.size * (1 + t * 1.6));
        animateWeakPoint(point, this.weakAge, 1 - t);
        if (this.weakTimer <= 0) this.hideWeakPoint(config);
        break;
      }
    }
  }

  private hideWeakPoint(config: WeakPointConfig): void {
    if (this.weakPoint) this.weakPoint.visible = false;
    this.weakState = 'hidden';
    this.weakTimer = config.respawn;
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

    if (!id) return;
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
      this.sniper.scale.setScalar(0.42);
      this.bullet = createBullet();
      this.scene.add(this.sniper);
      this.scene.add(this.bullet);
    }

    // Le tir se cale sur la caméra au moment où il part : c'est elle qui
    // orbite autour de la statue, et un fusil posé à un endroit fixe du monde
    // sortait du cadre dès qu'on avait tourné le moyai. Il vient ainsi
    // toujours se coller à la tête, en haut à droite de l'écran.
    const camera = this.camera;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const toward = camera.position.clone().normalize();
    this.shotTo.copy(toward).multiplyScalar(0.55).addScaledVector(up, 0.6);
    this.shotFrom
      .copy(this.shotTo)
      .addScaledVector(right, 1.25)
      .addScaledVector(up, 0.75)
      .addScaledVector(toward, 0.5);

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

  private renderFrame = (): void => {
    this.frameId = requestAnimationFrame(this.renderFrame);

    const delta = this.clock.getDelta();
    if (!this.userInteracted && this.moyai) {
      this.moyai.rotation.y += this.idleSpin() * delta;
    }

    this.orbit(delta);
    this.controls?.update();
    this.reportSpin(delta);
    this.animateShush(delta);
    this.animateTrickshot(delta);
    this.updateWeakPoint(delta);
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
