// Writes three.js meshes as 3MF packages for 3D printing: one object per mesh, with its colours
// as base materials (or vertex colours as a colour group), placed by build items, Z up, in the
// unit asked for (millimetres by default).

import * as THREE from 'three';
import { zipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { collectWorld, fileName, materialColor, toZUp, triangles, UNITS, type CollectOptions, type ExportFile } from './common.js';

export { collectWorld, type CollectOptions, type ExportFile, type Unit, UNITS } from './common.js';

export type ThreeMfUnit = 'micron' | 'millimeter' | 'centimeter' | 'inch' | 'foot' | 'meter';

export interface ThreeMfOptions extends CollectOptions {
  /** The unit of the model. Default 'millimeter', as slicers assume. */
  unit?: ThreeMfUnit;
  /** Writes material colours, and vertex colours where materials use them. Default true. */
  colors?: boolean;
  /** Metadata, such as Title, Designer, Description or Copyright. */
  metadata?: Record<string, string>;
  /** The file's name, without extension. Default 'scene'. */
  name?: string;
}

export interface ThreeMfExportResult {
  file: ExportFile;
  warnings: string[];
  stats: { objects: number; vertices: number; triangles: number; materials: number };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v: number) => (Math.abs(v) < 1e-12 ? '0' : String(+v.toPrecision(9)));
const hex = (c: THREE.Color, alpha = 1) => {
  const s = c.clone().convertLinearToSRGB();
  const b = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `#${b(s.r)}${b(s.g)}${b(s.b)}${alpha < 1 ? b(alpha) : ''}`;
};

/** Writes the meshes under `root` as a 3MF package. Lines and points are left out. */
export function export3mf(root: THREE.Object3D, options: ThreeMfOptions = {}): ThreeMfExportResult {
  const unit = options.unit ?? 'millimeter';
  const scale = 1 / (UNITS as Record<string, number>)[unit]!;
  const transform = toZUp(scale);
  const objects = collectWorld(root, options);
  const warnings: string[] = [];
  const meshes = objects.filter((o) => o.kind === 'mesh');
  if (meshes.length < objects.length) warnings.push(`${objects.length - meshes.length} lines and point clouds were left out: 3MF holds only triangle meshes`);
  const colors = options.colors !== false;

  // One base material per distinct material colour and opacity.
  const materialIndex = new Map<string, number>();
  const baseMaterials: string[] = [];
  const materialOf = (m: THREE.Material | undefined) => {
    const opacity = (m as THREE.MeshStandardMaterial | undefined)?.transparent ? (m as THREE.MeshStandardMaterial).opacity : 1;
    const color = hex(materialColor(m), opacity);
    const key = `${m?.name ?? ''}|${color}`;
    let i = materialIndex.get(key);
    if (i === undefined) {
      i = baseMaterials.length;
      materialIndex.set(key, i);
      baseMaterials.push(`<base name="${esc(m?.name || `Material ${i + 1}`)}" displaycolor="${color}"/>`);
    }
    return i;
  };

  const resources: string[] = [];
  const items: string[] = [];
  let nextId = 2;
  let vertexTotal = 0;
  let triangleTotal = 0;
  for (const o of meshes) {
    o.geometry.applyMatrix4(transform);
    const g = o.geometry;
    const p = g.getAttribute('position');
    const tris = triangles(g);
    if (!tris.length) continue;
    const vc = g.getAttribute('color');
    const vertexColors = colors && !!vc && o.materials.some((m) => (m as THREE.MeshStandardMaterial).vertexColors);
    const id = nextId++;
    const lines: string[] = [];
    let colorGroup = 0;
    if (vertexColors) {
      // Vertex colours go in a colour group, indexed per triangle corner.
      colorGroup = nextId++;
      const entries: string[] = [];
      const c = new THREE.Color();
      for (let i = 0; i < vc!.count; i++) entries.push(`<color color="${hex(c.setRGB(vc!.getX(i), vc!.getY(i), vc!.getZ(i)))}"/>`);
      resources.push(`<m:colorgroup id="${colorGroup}">${entries.join('')}</m:colorgroup>`);
    }
    lines.push('<vertices>');
    for (let i = 0; i < p.count; i++) lines.push(`<vertex x="${num(p.getX(i))}" y="${num(p.getY(i))}" z="${num(p.getZ(i))}"/>`);
    lines.push('</vertices><triangles>');
    const groupMaterial = o.materials.map((m) => (colors ? materialOf(m) : 0));
    for (const t of tris) {
      if (vertexColors) lines.push(`<triangle v1="${t.a}" v2="${t.b}" v3="${t.c}" pid="${colorGroup}" p1="${t.a}" p2="${t.b}" p3="${t.c}"/>`);
      else if (colors && o.materials.length > 1) lines.push(`<triangle v1="${t.a}" v2="${t.b}" v3="${t.c}" pid="1" p1="${groupMaterial[t.group] ?? 0}"/>`);
      else lines.push(`<triangle v1="${t.a}" v2="${t.b}" v3="${t.c}"/>`);
    }
    lines.push('</triangles>');
    const property = colors && !vertexColors ? ` pid="1" pindex="${groupMaterial[0] ?? materialOf(undefined)}"` : '';
    resources.push(`<object id="${id}" name="${esc(o.name)}" type="model"${property}><mesh>${lines.join('')}</mesh></object>`);
    items.push(`<item objectid="${id}"/>`);
    vertexTotal += p.count;
    triangleTotal += tris.length;
    g.dispose();
  }
  if (!items.length) warnings.push('There are no triangles to write');

  const metadata = { Application: 'mc-3mf-export', Title: options.name ?? 'scene', ...options.metadata };
  const model = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="${unit}" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">`,
    ...Object.entries(metadata).map(([k, v]) => `<metadata name="${esc(k)}">${esc(v)}</metadata>`),
    '<resources>',
    colors && baseMaterials.length ? `<basematerials id="1">${baseMaterials.join('')}</basematerials>` : '',
    ...resources,
    '</resources>',
    `<build>${items.join('')}</build>`,
    '</model>',
  ].join('\n');
  const enc = (s: string) => new TextEncoder().encode(s);
  const data = zipSync({
    '[Content_Types].xml': enc('<?xml version="1.0" encoding="UTF-8"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'),
    '_rels/.rels': enc('<?xml version="1.0" encoding="UTF-8"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'),
    '3D/3dmodel.model': enc(model),
  });
  return {
    file: { name: fileName(options.name, '3mf'), data, mimeType: 'model/3mf' },
    warnings,
    stats: { objects: items.length, vertices: vertexTotal, triangles: triangleTotal, materials: baseMaterials.length },
  };
}
