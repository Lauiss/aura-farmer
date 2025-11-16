import { Injectable, Type, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalManager {
  // Signal pour gérer le composant actif dans la modale
  currentComponent = signal<Type<any> | null>(null);
  modalData = signal<any>(null);

  open(component: Type<any>, data?: any) {
    this.modalData.set(data);
    this.currentComponent.set(component);
  }

  close() {
    this.currentComponent.set(null);
    this.modalData.set(null);
  }
}
