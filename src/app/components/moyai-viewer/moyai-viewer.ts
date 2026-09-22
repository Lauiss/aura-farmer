import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  AfterViewInit,
  inject,
  input,
  viewChild
} from '@angular/core';
import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { disposeObject } from '../../three/geometry';
import { createMoyai } from '../../three/models/moyai';

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
  private userInteracted = false;

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
    this.controls.rotateSpeed = 3;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 10;
    // Un peu d'inertie : la statue continue sur sa lancée après le relâchement.
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.12;
    this.controls.addEventListener('start', () => (this.userInteracted = true));
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
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
