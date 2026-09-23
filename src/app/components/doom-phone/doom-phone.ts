import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  viewChild
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as THREE from 'three';
import { createRandom, disposeObject } from '../../three/geometry';
import { createPhone } from '../../three/models/phone';
import { Doomscroll, DoomscrollOutcome, PostKind } from '../../services/doomscroll';
import { UtilityManager } from '../../services/utility-manager';
import { formatAura } from '../../pipes/format-aura';

const TEXTURE = { width: 256, height: 512 };
/** Barre du haut de l'application, au-dessus du fil. */
const HEADER_HEIGHT = 34;
/** Une publication occupe tout l'écran sous la barre, comme sur un vrai fil vertical. */
const POST_HEIGHT = TEXTURE.height - HEADER_HEIGHT;
/** Une publication au plus toutes les 0,3 s, quelle que soit la molette. */
const MAX_SPEED = POST_HEIGHT / 0.3;
/** Avance que l'on peut prendre sur le défilement, pour ne pas en stocker. */
const MAX_BACKLOG = POST_HEIGHT * 1.2;
/** Défilement automatique : une publication toutes les 1,1 s. */
const AUTO_SPEED = POST_HEIGHT / 1.1;

/**
 * Couleurs franches par nature de publication : on sait d'un coup d'œil si
 * celle qui arrive fait gagner ou perdre.
 */
const POST_STYLE: Record<PostKind | 'intro', { background: string; accent: string; symbol: string }> = {
  good: { background: '#1f8a52', accent: '#7dffb3', symbol: '+' },
  bad: { background: '#a3281f', accent: '#ff9d8f', symbol: '−' },
  chest: { background: '#b8860b', accent: '#ffe39a', symbol: '★' },
  intro: { background: '#2a2a27', accent: '#ede6d6', symbol: '↓' }
};

/**
 * Le téléphone du doomscrolling, posé à côté de la statue. On y fait défiler
 * un fil à la molette ou au doigt ; chaque publication, plein écran, est verte
 * (gain), rouge (perte) ou dorée (coffre), et son montant s'affiche au-dessus.
 *
 * Il a sa propre scène Three.js : la statue fait orbiter sa caméra, et le
 * téléphone n'a pas à tourner avec elle. Tout le rendu et la gestion du
 * défilement tournent hors de la zone Angular.
 */
@Component({
  selector: 'app-doom-phone',
  standalone: true,
  template: `
    <canvas #canvas [attr.aria-label]="label"></canvas>
    @if (utilityManager.doomscrollAutoOwned()) {
      <button
        type="button"
        class="auto"
        [class.on]="utilityManager.autoScrollEnabled()"
        [attr.aria-pressed]="utilityManager.autoScrollEnabled()"
        [attr.aria-label]="autoLabel"
        (click)="utilityManager.toggleAutoScroll()"
      >
        AUTO {{ utilityManager.autoScrollEnabled() ? 'ON' : 'OFF' }}
      </button>
    }
  `,
  styleUrl: './doom-phone.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoomPhone implements AfterViewInit, OnDestroy {

  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly zone = inject(NgZone);
  private readonly doomscroll = inject(Doomscroll);
  readonly utilityManager = inject(UtilityManager);
  private readonly translate = inject(TranslateService);

  readonly label = this.translate.instant('DOOMSCROLL_LABEL');
  readonly autoLabel = this.translate.instant('DOOMSCROLL_AUTO_TOGGLE');

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private phone?: THREE.Group;
  private texture?: THREE.CanvasTexture;
  private screen?: CanvasRenderingContext2D;
  private resizeObserver?: ResizeObserver;
  private frameId?: number;
  private readonly clock = new THREE.Clock();
  private elapsed = 0;

  /** Défilement visé et défilement affiché, en pixels de texture. */
  private target = 0;
  private position = 0;
  /** Dernière publication appliquée. La n° 0 est l'accueil, neutre. */
  private resolved = 0;
  /** Nature de chaque publication, tirée dès qu'elle devient visible. */
  private readonly kinds = new Map<number, PostKind>();
  private readonly outcomes = new Map<number, DoomscrollOutcome>();
  private dragFrom: number | null = null;
  private dirty = true;
  private autoShown = false;

  private readonly cleanups: (() => void)[] = [];

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.setup());
  }

  ngOnDestroy(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId);
    this.cleanups.forEach(cleanup => cleanup());
    this.resizeObserver?.disconnect();
    if (this.phone) disposeObject(this.phone);
    this.texture?.dispose();
    this.renderer?.dispose();
    // Le téléphone apparaît et disparaît avec l'écran de jeu : sans rendre le
    // contexte, le navigateur finit par refuser d'en ouvrir de nouveaux.
    this.renderer?.forceContextLoss();
  }

  private setup(): void {
    const canvas = this.canvasRef().nativeElement;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const surface = document.createElement('canvas');
    surface.width = TEXTURE.width;
    surface.height = TEXTURE.height;
    this.screen = surface.getContext('2d') ?? undefined;
    this.texture = new THREE.CanvasTexture(surface);
    this.texture.colorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xdfe4ea, 0x1a1a18, 1.1));
    const key = new THREE.DirectionalLight(0xfff1dd, 2);
    key.position.set(3, 4, 5);
    this.scene.add(key);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    this.camera.position.set(0, 0, 3.75);

    this.phone = createPhone(this.texture);
    // Légèrement tourné vers la statue, comme posé à côté d'elle.
    this.phone.rotation.set(-0.06, -0.26, 0.03);
    this.scene.add(this.phone);

    this.listen(canvas);
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host.nativeElement as HTMLElement);

    this.renderFrame();
  }

  /** Écouteurs posés à la main, hors zone : la molette tire des dizaines d'événements. */
  private listen(canvas: HTMLCanvasElement): void {
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (event: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions
    ) => {
      canvas.addEventListener(type, handler as EventListener, options);
      this.cleanups.push(() => canvas.removeEventListener(type, handler as EventListener));
    };

    on('wheel', event => {
      event.preventDefault();
      const lines = event.deltaMode === 1 ? 16 : 1;
      this.scrollBy(event.deltaY * lines * 1.2);
    }, { passive: false });

    on('pointerdown', event => {
      this.dragFrom = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    on('pointermove', event => {
      if (this.dragFrom === null) return;
      // Glisser vers le haut fait défiler vers le bas, comme sur un vrai fil.
      this.scrollBy((this.dragFrom - event.clientY) * 2.4);
      this.dragFrom = event.clientY;
    });
    const release = () => (this.dragFrom = null);
    on('pointerup', release);
    on('pointercancel', release);
  }

  /** On ne remonte pas le fil : seule la descente fait avancer. */
  private scrollBy(amount: number): void {
    if (amount <= 0) return;
    this.target = Math.min(this.target + amount, this.position + MAX_BACKLOG);
  }

  private resize(): void {
    const container = this.host.nativeElement as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height || !this.renderer || !this.camera) return;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private renderFrame = (): void => {
    this.frameId = requestAnimationFrame(this.renderFrame);
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.elapsed += delta;

    // Pilote automatique : il ne défile que tant que l'onglet est visible,
    // pour ne pas accumuler des pertes pendant qu'on regarde ailleurs.
    const auto = this.utilityManager.doomscrollAuto();
    // L'écran affiche l'état du pilote : il se redessine quand on le bascule.
    if (auto !== this.autoShown) {
      this.autoShown = auto;
      this.dirty = true;
    }
    if (auto && document.visibilityState === 'visible') {
      // La vitesse achetée s'applique ici, et nulle part ailleurs : le
      // défilement à la molette reste à la main du joueur.
      this.scrollBy(AUTO_SPEED * this.utilityManager.doomscrollSpeed() * delta);
    }

    const step = Math.min(this.target - this.position, MAX_SPEED * delta);
    if (step > 0.01) {
      this.position += step;
      this.dirty = true;
    }
    this.resolvePosts();

    if (this.phone) {
      // Léger flottement, et un sursaut d'inclinaison quand on scrolle vite.
      this.phone.position.y = Math.sin(this.elapsed * 1.4) * 0.03;
      this.phone.rotation.x = -0.06 - (step / (MAX_SPEED * Math.max(delta, 1e-3))) * 0.05;
    }

    if (this.dirty) {
      this.drawFeed();
      this.dirty = false;
    }
    if (this.renderer && this.scene && this.camera) this.renderer.render(this.scene, this.camera);
  };

  private kindOf(index: number): PostKind | 'intro' {
    if (index === 0) return 'intro';
    let kind = this.kinds.get(index);
    if (!kind) {
      kind = this.doomscroll.roll();
      this.kinds.set(index, kind);
    }
    return kind;
  }

  /** Applique chaque publication qui vient d'occuper tout l'écran. */
  private resolvePosts(): void {
    const reached = Math.floor(this.position / POST_HEIGHT + 0.02);
    while (this.resolved < reached) {
      this.resolved++;
      const kind = this.kindOf(this.resolved) as PostKind;
      // L'aura est un signal lu par l'affichage : on rentre dans la zone,
      // quelques fois par seconde au plus.
      const outcome = this.zone.run(() => this.doomscroll.resolve(kind));
      this.outcomes.set(this.resolved, outcome);
      // Seules les publications proches restent en mémoire.
      this.outcomes.delete(this.resolved - 4);
      this.kinds.delete(this.resolved - 4);
      this.announce(outcome);
      this.dirty = true;
    }
  }

  private drawFeed(): void {
    const ctx = this.screen;
    if (!ctx || !this.texture) return;
    const { width } = TEXTURE;

    const first = Math.floor(this.position / POST_HEIGHT);
    for (let index = first; index <= first + 1; index++) {
      this.drawPost(ctx, index, HEADER_HEIGHT + index * POST_HEIGHT - this.position);
    }

    // Barre de l'application, par-dessus le fil qui glisse dessous.
    ctx.fillStyle = '#161615';
    ctx.fillRect(0, 0, width, HEADER_HEIGHT);
    ctx.fillStyle = '#ede6d6';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🗿 feed', 12, HEADER_HEIGHT / 2 + 1);
    if (this.utilityManager.doomscrollAuto()) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e8b84b';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.fillText('AUTO', width - 12, HEADER_HEIGHT / 2 + 1);
    }

    this.texture.needsUpdate = true;
  }

  /**
   * Une publication plein écran : fond de la couleur de son verdict, une
   * vignette, le symbole, et le montant une fois appliquée.
   */
  private drawPost(ctx: CanvasRenderingContext2D, index: number, top: number): void {
    const kind = this.kindOf(index);
    const style = POST_STYLE[kind];
    const random = createRandom(index * 7919 + 13);
    const { width } = TEXTURE;
    const pad = 16;

    ctx.fillStyle = style.background;
    ctx.fillRect(0, top, width, POST_HEIGHT);

    // En-tête de la publication : avatar et pseudo.
    ctx.fillStyle = style.accent;
    ctx.beginPath();
    ctx.arc(pad + 12, top + 26, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8;
    ctx.fillRect(pad + 32, top + 18, 60 + random() * 60, 7);
    ctx.globalAlpha = 0.45;
    ctx.fillRect(pad + 32, top + 30, 34 + random() * 40, 5);
    ctx.globalAlpha = 1;

    // Vignette : une forme low poly qui occupe le cœur de l'écran.
    const cx = width / 2 + (random() - 0.5) * 40;
    const cy = top + POST_HEIGHT * 0.42;
    const radius = 54 + random() * 20;
    const sides = 3 + Math.floor(random() * 4);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const angle = (s / sides) * Math.PI * 2 + random();
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();

    // Symbole du verdict, et le montant quand la publication est appliquée.
    ctx.fillStyle = style.accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 96px system-ui, sans-serif';
    ctx.fillText(style.symbol, width / 2, cy);

    const outcome = this.outcomes.get(index);
    ctx.font = '800 26px system-ui, sans-serif';
    if (kind === 'chest') {
      ctx.fillText(this.translate.instant('DOOMSCROLL_CHEST'), width / 2, top + POST_HEIGHT * 0.72);
    } else if (outcome) {
      const sign = outcome.amount >= 0 ? '+' : '−';
      ctx.fillText(`${sign}${formatAura(Math.abs(outcome.amount))}`, width / 2, top + POST_HEIGHT * 0.72);
    }

    // Légende et barre d'actions en bas, comme un vrai fil vertical.
    ctx.globalAlpha = 0.55;
    ctx.fillRect(pad, top + POST_HEIGHT - 70, width * (0.45 + random() * 0.3), 6);
    ctx.fillRect(pad, top + POST_HEIGHT - 58, width * (0.3 + random() * 0.3), 6);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(width - pad - 10, top + POST_HEIGHT - 150 + i * 36, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /** Affiche le « +1.2 k doomscrolling » au-dessus du téléphone. */
  private announce(outcome: DoomscrollOutcome): void {
    const rect = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const good = outcome.kind !== 'bad';

    const span = document.createElement('span');
    span.textContent =
      outcome.kind === 'chest'
        ? this.translate.instant('DOOMSCROLL_CHEST')
        : `${outcome.amount >= 0 ? '+' : '-'}${formatAura(Math.abs(outcome.amount))}`;
    const caption = document.createElement('small');
    caption.textContent = this.translate.instant('DOOMSCROLL_FLOAT');
    Object.assign(caption.style, {
      display: 'block',
      fontSize: '13px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      opacity: '0.85'
    } as CSSStyleDeclaration);
    span.appendChild(caption);

    Object.assign(span.style, {
      position: 'fixed',
      left: `${rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width * 0.4}px`,
      top: `${rect.top + rect.height * 0.12}px`,
      transform: 'translate(-50%, -50%)',
      fontWeight: '800',
      fontSize: '30px',
      textAlign: 'center',
      color: outcome.kind === 'chest' ? '#ffd46b' : good ? '#57d38c' : '#ff5a46',
      textShadow: '0 2px 10px rgba(0,0,0,.6)',
      pointerEvents: 'none',
      zIndex: '2147483647',
      whiteSpace: 'nowrap'
    } as CSSStyleDeclaration);

    document.body.appendChild(span);
    const animation = span.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0 },
        { transform: 'translate(-50%, -80%) scale(1.05)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%, -160%) scale(1)', opacity: 0 }
      ],
      { duration: 900, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }
    );
    animation.onfinish = () => span.remove();
  }
}
