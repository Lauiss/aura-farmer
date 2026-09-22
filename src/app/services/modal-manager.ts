import { Injectable, Type, signal } from '@angular/core';

/**
 * Largeurs normalisées des modales. Les fixer évite que deux panneaux de même
 * nature (options, crédits) s'affichent à des tailles différentes selon la
 * longueur de leur contenu.
 */
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Injectable({
  providedIn: 'root'
})
export class ModalManager {
  // Signal pour gérer le composant actif dans la modale
  currentComponent = signal<Type<any> | null>(null);
  modalData = signal<any>(null);
  size = signal<ModalSize>('md');

  open(component: Type<any>, data?: any, size: ModalSize = 'md') {
    this.modalData.set(data);
    this.size.set(size);
    this.currentComponent.set(component);
  }

  close() {
    this.currentComponent.set(null);
    this.modalData.set(null);
    this.size.set('md');
  }
}
