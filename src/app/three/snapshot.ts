import * as THREE from 'three';
import { disposeObject } from './geometry';

/**
 * Rend un objet une seule fois dans un contexte WebGL jetable et renvoie
 * l'image en data URL.
 *
 * Pourquoi passer par une image plutôt que par un canvas vivant par icône : un
 * navigateur ne garde qu'une poignée de contextes WebGL simultanés (de l'ordre
 * de seize), et la liste des succès en affiche des dizaines. Une image rendue
 * une fois puis réutilisée donne le même visuel sans saturer le navigateur.
 */
export interface SnapshotOptions {
  size?: number;
  /** Distance de la caméra ; à ajuster selon l'encombrement du modèle. */
  distance?: number;
  /** Rotation appliquée avant le rendu, en radians. */
  rotation?: [number, number, number];
}

export function renderToDataUrl(
  object: THREE.Object3D,
  { size = 192, distance = 3.4, rotation = [0.12, 0.6, 0] }: SnapshotOptions = {}
): string {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);

  const scene = new THREE.Scene();
  object.rotation.set(...rotation);
  scene.add(object);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x30302c, 1.1));
  const key = new THREE.DirectionalLight(0xfff6e8, 2.4);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(-3, 2, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, distance);

  renderer.render(scene, camera);
  const dataUrl = renderer.domElement.toDataURL('image/png');

  // Le contexte est rendu au navigateur dès l'image obtenue.
  disposeObject(object);
  renderer.dispose();
  renderer.forceContextLoss();

  return dataUrl;
}
