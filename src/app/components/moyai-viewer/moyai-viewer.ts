import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
  inject,
  input,
  output,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { disposeObject } from '../../three/geometry';
import { createMoyai } from '../../three/models/moyai';
import { createFinger, setFingerOpacity } from '../../three/models/finger';

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
  private camera?: THREE.PerspectiveCamera;
  private controls?: TrackballControls;
  private moyai?: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private frameId?: number;
  private readonly clock = new THREE.Clock();
  /** Orientation de la caméra à l'image précédente, pour mesurer la rotation. */
  private readonly previousDirection = new THREE.Vector3();
  private readonly currentDirection = new THREE.Vector3();

  /** Geste du « chut ». Créé au premier appel, puis réutilisé. */
  private shush?: THREE.Group;
  private shushElapsed = 0;
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

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(0, 0.1, this.distance());

    this.moyai = createMoyai();
    this.moyai.rotation.set(...this.rotation());
    this.scene.add(this.moyai);

    this.addLights(this.scene);

    if (this.interactive()) this.setupControls(canvas);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    this.renderFrame();
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
    this.controls.dynamicDampingFactor = 0.035;
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
   * Joue le geste du mewing : l'index se dresse devant la bouche, tient la
   * pose, puis file le long de la mâchoire avant de s'effacer.
   *
   * Le doigt est enfant de la statue, donc il la suit si elle tourne.
   */
  playShush(): void {
    if (!this.moyai) return;

    if (!this.shush) {
      this.shush = createFinger();
      this.shush.scale.setScalar(0.5);
      this.moyai.add(this.shush);
    }

    this.shushElapsed = 0;
    this.shush.visible = true;
  }

  /** Positions clés du geste, dans le repère de la statue recentrée. */
  private static readonly SHUSH_MOUTH = new THREE.Vector3(0.24, -0.2, 1.05);
  private static readonly SHUSH_JAW = new THREE.Vector3(0.8, -0.66, 0.4);
  private static readonly SHUSH_DURATION = 1.45;

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

    finger.position.lerpVectors(MoyaiViewer.SHUSH_MOUTH, MoyaiViewer.SHUSH_JAW, eased);
    finger.rotation.set(0, 0, -eased * 0.9);

    const fadeIn = THREE.MathUtils.clamp(t / 0.1, 0, 1);
    const fadeOut = THREE.MathUtils.clamp((1 - t) / 0.18, 0, 1);
    setFingerOpacity(finger, Math.min(fadeIn, fadeOut));
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
    this.controls?.handleResize();
  }

  private renderFrame = (): void => {
    this.frameId = requestAnimationFrame(this.renderFrame);

    const delta = this.clock.getDelta();
    if (!this.userInteracted && this.moyai) {
      this.moyai.rotation.y += this.idleSpin() * delta;
    }

    this.controls?.update();
    this.reportSpin(delta);
    this.animateShush(delta);
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
