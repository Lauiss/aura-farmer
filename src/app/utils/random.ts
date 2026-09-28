/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 *
 * Il vit à part parce qu'il ne doit rien à la 3D : les décors 2D s'en servent
 * pour semer leurs silhouettes, et l'importer depuis `three/geometry` aurait
 * traîné Three.js dans un module qui n'en a pas besoin.
 *
 * Même graine, même dessin — c'est ce qui permet de décrire une ville entière
 * par un nombre plutôt que par une liste de coordonnées.
 */
export function createRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
