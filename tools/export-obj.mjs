/**
 * Exporte un modèle du jeu en OBJ + MTL, ouvrable dans Blender.
 *
 * Les modèles n'existent nulle part sous forme de fichier : ils sont
 * construits par du code au démarrage. Cet export est donc une **copie** à un
 * instant donné, pas la source — la source reste le TypeScript.
 */
import * as THREE from 'three';
import { writeFileSync } from 'node:fs';
import { createMoyai } from './build/app/three/models/moyai.js';

function exportObj(root, name) {
  root.updateMatrixWorld(true);
  const lines = [`# ${name} — exporté depuis AuraFarmer`, `mtllib ${name}.mtl`];
  const materials = new Map();
  let offset = 1;

  root.traverse(node => {
    if (!node.isMesh) return;
    const colour = new THREE.Color(node.material.color).convertLinearToSRGB();
    const key = colour.getHexString();
    if (!materials.has(key)) materials.set(key, colour);

    const pos = node.geometry.attributes.position;
    const index = node.geometry.index;
    const count = index ? index.count : pos.count;
    const at = i => new THREE.Vector3()
      .fromBufferAttribute(pos, index ? index.getX(i) : i)
      .applyMatrix4(node.matrixWorld);

    lines.push(`o ${node.name || 'part'}_${offset}`, `usemtl m_${key}`);
    const verts = [];
    for (let i = 0; i < count; i++) verts.push(at(i));
    for (const v of verts) lines.push(`v ${v.x.toFixed(5)} ${v.y.toFixed(5)} ${v.z.toFixed(5)}`);
    for (let i = 0; i < verts.length; i += 3) {
      lines.push(`f ${offset + i} ${offset + i + 1} ${offset + i + 2}`);
    }
    offset += verts.length;
  });

  const mtl = [...materials.entries()].flatMap(([key, c]) =>
    [`newmtl m_${key}`, `Kd ${c.r.toFixed(4)} ${c.g.toFixed(4)} ${c.b.toFixed(4)}`, 'illum 1', '']);

  writeFileSync(`${name}.obj`, lines.join('\n') + '\n');
  writeFileSync(`${name}.mtl`, mtl.join('\n'));
  console.log(`${name}.obj — ${offset - 1} sommets, ${materials.size} matériaux`);
}

exportObj(createMoyai(), 'moyai');
exportObj(createMoyai({ palette: { stone: 0xe8b84b, stoneDark: 0xc2912d, cavity: 0x5a3a0a } }), 'moyai-dore');
