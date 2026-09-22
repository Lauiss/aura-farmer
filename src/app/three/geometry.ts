import * as THREE from 'three';

/**
 * Boîte à outils partagée par tous les modèles Three.js du jeu. Tout ce qui est
 * réutilisable d'un modèle à l'autre vit ici ; un modèle donné (dans `models/`)
 * ne porte alors plus que ses propres cotes.
 *
 * Le parti pris est le low poly : géométries non indexées et `flatShading`, donc
 * des facettes franches plutôt que des surfaces lissées.
 */

/**
 * Section horizontale d'un volume lissé. `front` et `back` sont indépendants,
 * ce qui permet de dessiner un profil — une face qui avance à un endroit et
 * recule à un autre.
 */
export interface Ring {
  y: number;
  halfWidth: number;
  front: number;
  back: number;
  /** Proportion de chanfrein des angles, de 0 (rectangle) à 0.5 (losange). */
  chamfer?: number;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Les huit sommets d'une section : un rectangle dont les angles sont coupés. */
function ringPoints(ring: Ring): THREE.Vector3[] {
  const { y, halfWidth: w, front: f, back: b, chamfer = 0.2 } = ring;
  const dx = w * 2 * chamfer;
  const dz = (f - b) * chamfer;
  return [
    new THREE.Vector3(-w + dx, y, f),
    new THREE.Vector3(w - dx, y, f),
    new THREE.Vector3(w, y, f - dz),
    new THREE.Vector3(w, y, b + dz),
    new THREE.Vector3(w - dx, y, b),
    new THREE.Vector3(-w + dx, y, b),
    new THREE.Vector3(-w, y, b + dz),
    new THREE.Vector3(-w, y, f - dz)
  ];
}

/**
 * Relie les sections entre elles et ferme les deux extrémités. La géométrie est
 * produite non indexée : chaque triangle possède ses propres sommets, ce qui
 * garantit des facettes franches une fois les normales calculées.
 */
export function loft(rings: Ring[]): THREE.BufferGeometry {
  const sections = rings.map(ringPoints);
  const vertices: number[] = [];

  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };

  // Paroi latérale.
  for (let s = 0; s < sections.length - 1; s++) {
    const lower = sections[s];
    const upper = sections[s + 1];
    for (let i = 0; i < lower.length; i++) {
      const j = (i + 1) % lower.length;
      // Enroulement anti-horaire vu de l'extérieur : les normales calculées
      // ensuite pointent vers l'extérieur, sinon le modèle se rend à l'envers
      // (ses faces avant sont supprimées par le culling).
      pushTriangle(lower[i], upper[j], upper[i]);
      pushTriangle(lower[i], lower[j], upper[j]);
    }
  }

  // Bouchons : éventail de triangles depuis le centre de la section.
  const cap = (points: THREE.Vector3[], upward: boolean) => {
    const center = points
      .reduce((sum, p) => sum.add(p), new THREE.Vector3())
      .divideScalar(points.length);
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      if (upward) pushTriangle(center, points[i], points[j]);
      else pushTriangle(center, points[j], points[i]);
    }
  };
  cap(sections[0], false);
  cap(sections[sections.length - 1], true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Déplace chaque sommet pour casser la régularité du maillage et donner
 * l'aspect d'une taille à la main. Les sommets qui partagent une position sont
 * déplacés ensemble, sinon la maille s'ouvre.
 */
export function chisel(
  geometry: THREE.BufferGeometry,
  amount: number,
  random: () => number
): THREE.BufferGeometry {
  if (amount <= 0) return geometry;

  const position = geometry.attributes['position'] as THREE.BufferAttribute;
  const offsets = new Map<string, [number, number, number]>();

  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(3)}|${position.getY(i).toFixed(3)}|${position.getZ(i).toFixed(3)}`;
    let offset = offsets.get(key);
    if (!offset) {
      offset = [
        (random() - 0.5) * amount,
        (random() - 0.5) * amount,
        (random() - 0.5) * amount
      ];
      offsets.set(key, offset);
    }
    position.setXYZ(
      i,
      position.getX(i) + offset[0],
      position.getY(i) + offset[1],
      position.getZ(i) + offset[2]
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/** Raccourci pour poser une géométrie dans la scène avec sa transformation. */
export function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(...position);
  result.rotation.set(...rotation);
  return result;
}

/** Libère la mémoire GPU de toutes les géométries et matériaux d'un groupe. */
export function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse(child => {
    const asMesh = child as THREE.Mesh;
    if (!asMesh.isMesh) return;
    asMesh.geometry.dispose();
    const material = asMesh.material;
    if (Array.isArray(material)) material.forEach(m => materials.add(m));
    else materials.add(material);
  });
  materials.forEach(m => m.dispose());
}
