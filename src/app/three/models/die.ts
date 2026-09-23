import * as THREE from 'three';
import { mesh } from '../geometry';

/**
 * Le dé à vingt faces des battles d'aura.
 *
 * Un icosaèdre, donc exactement vingt faces triangulaires : la forme est la
 * bonne par construction, pas par approximation. Les pastilles posées sur
 * quelques facettes suffisent à le faire lire comme un dé plutôt que comme un
 * caillou, sans avoir à graver des chiffres illisibles en 24 px.
 */

const BODY = 0xe8b84b;
const PIP = 0x2a2620;

export function createDie(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'die';

  const geometry = new THREE.IcosahedronGeometry(1, 0);
  group.add(
    mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: BODY,
        flatShading: true,
        roughness: 0.4,
        // Bas volontairement : sans carte d'environnement, un métal élevé rend
        // presque noir.
        metalness: 0.1
      })
    )
  );

  // Pastilles au centre de quelques faces, posées juste au-dessus de la
  // surface pour ne pas s'y enfoncer. Les normales des faces sont lues
  // directement dans la géométrie.
  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  const pip = new THREE.MeshBasicMaterial({ color: PIP });
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let face = 0; face < position.count / 3; face += 3) {
    const i = face * 3;
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);

    const center = a.clone().add(b).add(c).divideScalar(3);
    const dot = mesh(new THREE.SphereGeometry(0.12, 5, 4), pip, [center.x, center.y, center.z]);
    // Ramenée à la surface : le centre d'une facette d'icosaèdre est plus
    // près du centre que ses sommets.
    dot.position.multiplyScalar(1.04);
    group.add(dot);
  }

  return group;
}
