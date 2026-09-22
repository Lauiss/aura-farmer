import { Injectable, Type, computed, signal } from '@angular/core';

/**
 * Largeurs normalisées des modales. Les fixer évite que deux panneaux de même
 * nature (options, crédits) s'affichent à des tailles différentes selon la
 * longueur de leur contenu.
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalEntry {
  component: Type<any>;
  data?: any;
  size: ModalSize;
}

/**
 * Pile de modales : ouvrir n'écrase pas ce qui est déjà affiché, mais empile
 * par-dessus, et fermer ne retire que le panneau du dessus. C'est ce qui permet
 * d'ouvrir le détail d'un succès devant la liste sans la perdre.
 */
@Injectable({
  providedIn: 'root'
})
export class ModalManager {

  private readonly stack = signal<ModalEntry[]>([]);

  readonly entries = this.stack.asReadonly();

  /** Composant et données du panneau du dessus, celui avec lequel on interagit. */
  readonly currentComponent = computed(() => this.stack().at(-1)?.component ?? null);
  readonly modalData = computed(() => this.stack().at(-1)?.data ?? null);

  open(component: Type<any>, data?: any, size: ModalSize = 'md') {
    this.stack.update(stack => [...stack, { component, data, size }]);
  }

  /** Ferme le panneau du dessus et révèle celui qui se trouvait dessous. */
  close() {
    this.stack.update(stack => stack.slice(0, -1));
  }

  /** Referme toute la pile d'un coup. */
  closeAll() {
    this.stack.set([]);
  }
}
