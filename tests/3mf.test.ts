import * as THREE from 'three';
import { unzipSync } from 'three/examples/jsm/libs/fflate.module.js';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { describe, expect, it } from 'vitest';
import { export3mf } from '../src/index.js';

const read = (data: Uint8Array) => new ThreeMFLoader().parse(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer);
const meshes = (g: THREE.Object3D) => {
  const out: THREE.Mesh[] = [];
  g.updateMatrixWorld(true);
  g.traverse((o) => (o as THREE.Mesh).isMesh && out.push(o as THREE.Mesh));
  return out;
};

function scene() {
  const s = new THREE.Scene();
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.03), new THREE.MeshStandardMaterial({ name: 'Red', color: 0xff0000 }));
  red.position.set(0.05, 0, 0);
  const blue = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 6), new THREE.MeshStandardMaterial({ name: 'Blue', color: 0x0000ff }));
  s.add(red, blue);
  return s;
}

describe('3MF', () => {
  it('writes a package the 3MF loader reads, in millimetres and Z up', () => {
    const r = export3mf(scene(), { name: 'parts', metadata: { Designer: 'Test' } });
    expect(r.file.name).toBe('parts.3mf');
    expect(r.stats).toMatchObject({ objects: 2, materials: 2 });
    const files = unzipSync(r.file.data);
    expect(Object.keys(files).sort()).toEqual(['3D/3dmodel.model', '[Content_Types].xml', '_rels/.rels']);
    const model = new TextDecoder().decode(files['3D/3dmodel.model']);
    expect(model).toContain('unit="millimeter"');
    expect(model).toContain('<metadata name="Designer">Test</metadata>');
    expect(model).toContain('displaycolor="#FF0000"');

    const g = read(r.file.data);
    const [box] = meshes(g);
    const size = new THREE.Box3().setFromObject(box!).getSize(new THREE.Vector3());
    // 20 x 10 x 30 mm with Y up turned to Z up: 20 x 30 x 10.
    expect([size.x, size.y, size.z].map((v) => Math.round(v))).toEqual([20, 30, 10]);
    expect(((box!.material as THREE.MeshStandardMaterial).color.r)).toBeCloseTo(1);
  });

  it('writes vertex colours as a colour group, and several materials per mesh', () => {
    const s = new THREE.Scene();
    const g = new THREE.BoxGeometry(1, 1, 1);
    const colors = new Float32Array(g.getAttribute('position').count * 3).fill(0.5);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    s.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true })));
    const r = export3mf(s, { unit: 'meter' });
    const model = new TextDecoder().decode(unzipSync(r.file.data)['3D/3dmodel.model']);
    expect(model).toContain('<m:colorgroup');
    expect(model).toContain('unit="meter"');

    const multi = new THREE.Scene();
    multi.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff].map((c) => new THREE.MeshStandardMaterial({ color: c }))));
    const m = export3mf(multi);
    expect(m.stats.materials).toBe(6);
    expect(new TextDecoder().decode(unzipSync(m.file.data)['3D/3dmodel.model'])).toContain('pid="1" p1="5"');
  });

  it('leaves out points and lines', () => {
    const s = scene();
    s.add(new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3))));
    const r = export3mf(s);
    expect(r.warnings[0]).toContain('1 lines and point clouds');
    expect(r.stats.objects).toBe(2);
  });
});
