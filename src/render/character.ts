import * as T from 'three';
import type { Appearance } from '../game/appearance';
import headData from '../assets/human-head.json';

export interface Character {
  group: T.Group;
  animate(time: number, walking: boolean, reducedMotion?: boolean): void;
  dispose(): void;
}

/** CC0 MakeHuman adult facial topology with original parametric clothing/body. */
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
  const sole = material('#d7cbb8', .7);
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
  type Ring = [number, number, number, number?];
  function surface(parent: T.Object3D, rings: Ring[], mat: T.Material, breast = 0) {
    rings = [...rings].sort((left, right) => left[0] - right[0]);
    // Subdivide profiles before revolving; smooth contours without faceted joints.
    const original = rings;
    rings = [];
    for (let j = 0; j < original.length - 1; j++) {
      const prev = original[Math.max(0, j - 1)]!; const left = original[j]!;
      const right = original[j + 1]!; const after = original[Math.min(original.length - 1, j + 2)]!;
      for (let k = 0; k < 3; k++) {
        const t = k / 3;
        const interpolate = (axis: number) => {
          const p0 = prev[axis] ?? 0; const p1 = left[axis] ?? 0; const p2 = right[axis] ?? 0; const p3 = after[axis] ?? 0;
          return .5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
        };
        rings.push([T.MathUtils.lerp(left[0], right[0], t), Math.max(.001, interpolate(1)), Math.max(.001, interpolate(2)), interpolate(3)]);
      }
    }
    rings.push(original[original.length - 1]!);
    const verts: number[] = []; const uv: number[] = []; const indices: number[] = [];
    rings.forEach(([y, rx, rz, offset = 0], j) => {
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2;
        const front = Math.max(0, Math.cos(angle));
        const swell = breast * Math.exp(-Math.pow((y - 1.31) / .09, 2)) * front * (.65 + .35 * Math.abs(Math.sin(angle * 2)));
        verts.push(Math.sin(angle) * rx, y, Math.cos(angle) * rz + offset + swell);
        uv.push(i / segments, j / (rings.length - 1));
        if (j < rings.length - 1 && i < segments) {
          const p = j * (segments + 1) + i;
          indices.push(p, p + 1, p + segments + 1, p + 1, p + segments + 2, p + segments + 1);
        }
      }
    });
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.computeVertexNormals(); geos.add(geo);
    const mesh = new T.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const hips = .17 + a.hips * .10 + a.build * .025;
  const waist = .12 + a.waist * .095 + a.build * .025;
  const shoulder = (female ? .195 : .218) + a.build * .05 + (female ? 0 : a.chest * .025);
  const torso = new T.Group(); group.add(torso);
  surface(torso, [
    [.955, hips * .965, .141 + a.build * .04], [.98, hips * .94, .135 + a.build * .035],
    [1.04, waist * 1.12, .115 + a.waist * .05], [1.12, waist, .103 + a.waist * .05],
    [1.22, waist * .65 + shoulder * .35, .12 + a.build * .02],
    [1.31, shoulder * .92, .125 + a.chest * .02], [1.4, shoulder, .12], [1.45, shoulder * .96, .108],
    [1.49, .075, .063], [1.49, .001, .001],
  ], cloth, female ? .018 + a.chest * .055 : a.chest * .012);
  surface(torso, [[.78, hips * .65, .075], [.85, hips * .93, .132 + a.build * .035], [.91, hips, .145 + a.build * .04], [.958, hips * .958, .139 + a.build * .04]], trousers);
  surface(torso, [[1.475, .068, .06], [1.52, .063, .061, .03], [1.55, .059, .057, .034]], skin);
  // Collar and stitched hem provide readable clothing detail.
  surface(torso, [[1.462, .09, .075], [1.485, .078, .067]], material('#c1ad85', .95));
  const buckle = ellipsoid(torso, [0, .931, .175 + a.build * .04], [.025, .023, .008], gold); buckle.visible = detailed;

  const legPivots: T.Group[] = []; const knees: T.Group[] = []; const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * hips * .51, .91, 0); group.add(leg); legPivots.push(leg);
    const thigh = .079 + a.build * .032 + a.hips * .025;
    surface(leg, [[0, thigh * .98, thigh], [-.075, thigh * 1.08, thigh * 1.05], [-.23, thigh * .94, thigh * .94], [-.4, .062 + a.build * .015, .062 + a.build * .018], [-.46, .06 + a.build * .012, .067]], trousers);
    const knee = new T.Group(); knee.position.y = -.43; leg.add(knee); knees.push(knee);
    surface(knee, [[0, .058 + a.build * .013, .065], [-.12, .073 + a.build * .025, .076 + a.build * .02], [-.26, .057 + a.build * .017, .06], [-.37, .043 + a.build * .01, .047], [-.395, .046, .048]], trousers);
    ellipsoid(knee, [0, -.409, .056], [.067, .065, .132], shoe);
    ellipsoid(knee, [0, -.448, .056], [.072, .024, .141], sole);
    if (detailed) for (let j = 0; j < 4; j++) ellipsoid(knee, [0, -.365 - j * .006, .07 + j * .015], [.045, .004, .004], sole);
    const arm = new T.Group(); arm.position.set(side * shoulder * .98, 1.4, 0); arm.rotation.z = side * .09; torso.add(arm); arms.push(arm);
    const armWidth = .046 + a.build * .029;
    surface(arm, [[.025, armWidth * .6, armWidth], [-.045, armWidth * 1.13, armWidth * 1.15], [-.16, armWidth * 1.09, armWidth], [-.175, armWidth, armWidth]], cloth);
    surface(arm, [[-.17, armWidth * .92, armWidth * .93], [-.26, armWidth * .85, armWidth * .8], [-.32, armWidth * .75, armWidth * .7], [-.41, armWidth * .64, armWidth * .68], [-.51, .028, .03]], skin);
    ellipsoid(arm, [0, -.55, .003], [.035 + a.build * .008, .056, .024], skin);
    for (let f = 0; f < 4; f++) {
      const len = f === 0 || f === 3 ? .055 : .067;
      ellipsoid(arm, [(f - 1.5) * .016, -.593 - len * .28, .006], [.009, len * .53, .011], skin);
    }
    const thumb = ellipsoid(arm, [-side * .038, -.552, .016], [.012, .037, .015], skin); thumb.rotation.z = side * .4;
    if (detailed && side === -1) surface(arm, [[-.48, .033, .034], [-.463, .034, .035]], gold);
  }

  // A real sculpted adult head topology, sourced from CC0 MakeHuman assets.
  const head = new T.Group(); torso.add(head);
  const width = .96 + a.face * .12;
  const data = headData[a.frame];
  const headGeo = new T.BufferGeometry();
  const headPositions = data.positions.map((n, i) => i % 3 === 0 ? n * width : n);
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
  // Match the sculpted head to the clothed body's shoulder height and proportions.
  head.scale.setScalar(1.13); head.position.y = -1.72 * .13 - .06;
  return {
    group,
    animate(time, walking, reducedMotion = false) {
      const cycle = reducedMotion ? 0 : Math.sin(time * 7.5);
      legPivots.forEach((leg, i) => { leg.rotation.x = walking ? cycle * (i ? -1 : 1) * .32 : 0; });
      knees.forEach((knee, i) => { knee.rotation.x = walking ? Math.max(0, cycle * (i ? 1 : -1)) * .36 : 0; });
      arms.forEach((arm, i) => { arm.rotation.x = walking ? cycle * (i ? 1 : -1) * .22 : -.04; });
      torso.position.y = !reducedMotion && !walking ? Math.sin(time * 1.8) * .002 : 0;
      head.rotation.y = !reducedMotion && !walking ? Math.sin(time * .3) * .035 : 0;
    },
    dispose() { geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); },
  };
}
