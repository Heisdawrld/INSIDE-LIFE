import * as T from 'three';
import type { Appearance } from '../game/appearance';
import headData from '../assets/human-head.json';
import { createBody } from './body';

export interface Character {
  group: T.Group;
  animate(time: number, walking: boolean, reducedMotion?: boolean): void;
  dispose(): void;
}

/** CC0 anatomical adult meshes with a compact continuous skinning rig. */
export function createCharacter(a: Appearance, shirtColor: string, detailed = false): Character {
  const group = new T.Group();
  group.scale.setScalar(.96 + a.height * .16);
  const geos = new Set<T.BufferGeometry>();
  const mats = new Set<T.Material>();
  const textures = new Set<T.Texture>();
  const segments = detailed ? 32 : 16;
  const sphereGeo = new T.SphereGeometry(1, segments, detailed ? 24 : 12); geos.add(sphereGeo);
  function material(color: string, roughness = .85, metalness = 0) {
    const m = new T.MeshStandardMaterial({ color, roughness, metalness }); mats.add(m); return m;
  }
  const skin = material(a.skin, .64);
  const cloth = material(shirtColor, .94);
  const trousers = material('#27332f', .92);
  const hair = material(a.hairColor, .95);

  const shoe = material('#d5ba8d', .7);
  const gold = material('#c6a354', .33, .55);
  const female = a.frame === 'feminine';
  // Self-authored subtle surface variation.
  if (detailed) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d')!; const pixels = context.createImageData(128, 128);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const n = 115 + ((i * 73 + (i >> 4) * 19) % 27);
      pixels.data[i] = n; pixels.data[i + 1] = n; pixels.data[i + 2] = n; pixels.data[i + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const t = new T.CanvasTexture(canvas); t.wrapS = t.wrapT = T.RepeatWrapping; textures.add(t);
    skin.bumpMap = t; skin.bumpScale = .0009; cloth.bumpMap = t; cloth.bumpScale = .0013;
  }
  function ellipsoid(parent: T.Object3D, pos: number[], scale: number[], mat: T.Material) {
    const m = new T.Mesh(sphereGeo, mat); m.position.set(pos[0]!, pos[1]!, pos[2]!); m.scale.set(scale[0]!, scale[1]!, scale[2]!); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  const torso = new T.Group(); group.add(torso);
  const body = createBody(a, [skin, cloth, trousers, shoe]); torso.add(body.mesh);

  // A real sculpted adult head topology, sourced from CC0 MakeHuman assets.
  const head = new T.Group(); torso.add(head);
  const width = .96 + a.face * .12;
  const data = headData[a.frame];
  const headGeo = new T.BufferGeometry();
  const headPositions = data.positions.map((n, i) => i % 3 === 0 ? n * T.MathUtils.lerp(1, width, T.MathUtils.smoothstep(data.positions[i + 1]!, 1.6, 1.68)) : n);
  headGeo.setAttribute('position', new T.Float32BufferAttribute(headPositions, 3));
  headGeo.setIndex(data.indices); headGeo.computeVertexNormals(); geos.add(headGeo);
  const headMesh = new T.Mesh(headGeo, skin); headMesh.castShadow = true; headMesh.receiveShadow = true; head.add(headMesh);
  const eyeWhite = material('#c7beab', .5); const iris = material('#4d3520', .4); const pupil = material('#151710', .28);
  const brow = material(a.hairColor, .95);
  const ray = new T.Raycaster();
  function frontAt(x: number, y: number) {
    ray.set(new T.Vector3(x, y, 1), new T.Vector3(0, 0, -1));
    return ray.intersectObject(headMesh)[0]?.point.z ?? .10;
  }
  for (const eye of data.eyes) {
    const x = eye[0]! * width; const y = eye[1]!; const z = eye[2]!;
    ellipsoid(head, [x, y, z], [.0185, .0185, .0185], eyeWhite);
    ellipsoid(head, [x, y, z + .0171], [.0086, .0086, .003], iris);
    ellipsoid(head, [x, y, z + .0195], [.0037, .0041, .0011], pupil);
    if (detailed) ellipsoid(head, [x - .002, y + .003, z + .0205], [.0015, .0015, .0004], eyeWhite);
    const points = Array.from({ length: 9 }, (_, i) => {
      const bx = x + (i - 4) * .0048; const by = y + .025 + Math.sin(i / 8 * Math.PI) * .004;
      return new T.Vector3(bx, by, frontAt(bx, by) + .001);
    });
    const browGeo = new T.TubeGeometry(new T.CatmullRomCurve3(points), 16, .0022, 5, false);
    geos.add(browGeo); head.add(new T.Mesh(browGeo, brow));
  }
  if (female) for (const side of [-1, 1]) {
    const geo = new T.TorusGeometry(.016, .0025, 6, 18); geos.add(geo);
    const hoop = new T.Mesh(geo, gold); hoop.position.set(side * .083 * width, 1.69, .017); head.add(hoop);
  }
  // Hair is its own silhouette; every style is viewable from the back.
  const scalpGeo = headGeo.clone();
  const scalpPositions = scalpGeo.getAttribute('position');
  const normals = scalpGeo.getAttribute('normal');
  const scalpIndices: number[] = [];
  const onScalp = (i: number) => scalpPositions.getY(i) > (scalpPositions.getZ(i) > .075 ? 1.805 : 1.735);
  for (let i = 0; i < data.indices.length; i += 3) {
    const triangle = data.indices.slice(i, i + 3);
    if (triangle.every(onScalp)) scalpIndices.push(...triangle);
  }
  for (let i = 0; i < scalpPositions.count; i++) {
    scalpPositions.setXYZ(i, scalpPositions.getX(i) + normals.getX(i) * .003, scalpPositions.getY(i) + normals.getY(i) * .003, scalpPositions.getZ(i) + normals.getZ(i) * .003);
  }
  scalpGeo.setIndex(scalpIndices); geos.add(scalpGeo); head.add(new T.Mesh(scalpGeo, hair));
  if (a.hair === 'afro') {
    ellipsoid(head, [0, 1.852, -.02], [.164, .132, .139], hair);
    for (let i = 0; i < (detailed ? 55 : 24); i++) {
      const theta = i * 2.399; const t = i / (detailed ? 55 : 24); const y = 1.78 + t * .19; const rad = .155 * Math.sqrt(1 - Math.pow((y - 1.84) / .15, 2));
      ellipsoid(head, [Math.cos(theta) * rad, y, -.02 + Math.sin(theta) * rad * .9], [.027, .03, .027], hair);
    }
  } else if (a.hair === 'bun') {
    ellipsoid(head, [0, 1.815, -.062], [.054, .055, .055], hair);
    const tieGeo = new T.TorusGeometry(.037, .004, 5, 16); geos.add(tieGeo); const tie = new T.Mesh(tieGeo, gold); tie.position.set(0, 1.815, -.032); head.add(tie);
  } else if (a.hair === 'locs') {
    for (let i = 0; i < (detailed ? 26 : 14); i++) {
      const angle = i / (detailed ? 26 : 14) * Math.PI * 2;
      if (Math.cos(angle) > .65) continue;
      const x = Math.sin(angle) * .111; const z = Math.cos(angle) * .096;
      const curve = new T.CatmullRomCurve3([new T.Vector3(x * .7, 1.854, z * .7), new T.Vector3(x * 1.14, 1.73, z * 1.2), new T.Vector3(x * 1.28, 1.5 - i % 4 * .025, z * 1.32)]);
      const geo = new T.TubeGeometry(curve, 10, .011, 6, false); geos.add(geo); const loc = new T.Mesh(geo, hair); loc.castShadow = true; head.add(loc);
      if (i % 5 === 0) ellipsoid(head, [x * 1.26, 1.54, z * 1.3], [.013, .018, .013], gold);
    }
  }
  return {
    group,
    animate(time, walking, reducedMotion = false) {
      body.animate(time, walking, reducedMotion);
      torso.position.y = !reducedMotion && !walking ? Math.sin(time * 1.8) * .002 : 0;
      head.rotation.y = !reducedMotion && !walking ? Math.sin(time * .3) * .035 : 0;
    },
    dispose() { body.dispose(); geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); },
  };
}
