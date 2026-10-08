import * as T from 'three';
import bodyData from '../assets/human-body.json';
import type { Appearance } from '../game/appearance';

export type CharacterPose = 'natural' | 'confident' | 'relaxed';

/** Continuous clothed anatomical mesh with normalized CC0 skin weights. */
export function createBody(a: Appearance, materials: T.Material[]) {
  const data = bodyData[a.frame];
  const gaussian = (y: number, center: number, spread: number) => Math.exp(-(((y - center) / spread) ** 2));
  function shape(x: number, y: number, z: number): T.Vector3 {
    // Smooth anatomical regions avoid the hard bands of independent primitives.
    const hip = gaussian(y, .96, .19);
    const waist = gaussian(y, 1.17, .115);
    const chest = gaussian(y, 1.38, .125);
    const torso = Math.max(0, 1 - Math.max(0, Math.abs(x) - .21) / .14);
    const upper = gaussian(y, 1.18, .45);
    const fullness = (a.build - .4) * .28;
    const width = 1 + fullness * upper + (a.hips - .35) * .38 * hip * torso + (a.waist - .45) * .36 * waist * torso + (a.chest - .45) * .17 * chest * torso;
    const depth = 1 + fullness * upper + (a.hips - .35) * .28 * hip * torso + (a.waist - .45) * .4 * waist * torso + (a.chest - .45) * (a.frame === 'feminine' ? .4 : .2) * chest * torso;
    const neck = T.MathUtils.smoothstep(y, 1.48, 1.6);
    return new T.Vector3(x * T.MathUtils.lerp(width, 1, neck), y, z * T.MathUtils.lerp(depth, 1, neck));
  }
  const vertices: number[] = [];
  const outfit = a.outfit ?? 'fitted';
  const fabricVertices = new Set(data.regions[1]);
  const trouserVertices = new Set(data.regions[2]);
  const mass = Math.max(0, a.build - .2) * (a.frame === 'feminine' ? 1.1 : .65);
  for (let i = 0; i < data.positions.length; i += 3) {
    const neckFade = 1 - T.MathUtils.smoothstep(data.positions[i + 1]!, 1.45, 1.6);
    shape(data.positions[i]! + data.mass[i]! * mass * neckFade, data.positions[i + 1]! + data.mass[i + 1]! * mass * neckFade, data.positions[i + 2]! + data.mass[i + 2]! * mass * neckFade).toArray(vertices, i);
    const y = data.positions[i + 1]!;
    if (y > .18 && y < .96) {
      const start = data.positions[i]! > 0 ? 4 : 10;
      const upper = y >= data.bones[start + 1]![1]!;
      const from = data.bones[upper ? start : start + 1]!;
      const to = data.bones[upper ? start + 1 : start + 2]!;
      const t = T.MathUtils.clamp((y - from[1]!) / (to[1]! - from[1]!), 0, 1);
      const center = shape(T.MathUtils.lerp(from[0]!, to[0]!, t), y, T.MathUtils.lerp(from[2]!, to[2]!, t));
      const blend = T.MathUtils.smoothstep(y, .18, .25) * (1 - T.MathUtils.smoothstep(y, .82, .96));
      const thickness = 1 + ((a.hips - .35) * .85 + (a.build - .4) * .6) * gaussian(y, .73, .21) * blend;
      vertices[i] = center.x + (vertices[i]! - center.x) * thickness;
      vertices[i + 2] = center.z + (vertices[i + 2]! - center.z) * thickness;
    }
  }
  // Fair the garment after body morphs so anatomical creases do not become
  // sharp fabric ridges. Preserve the collar, sleeves and waist boundaries.
  const otherRegions = new Set([...data.regions[0]!, ...data.regions[2]!]);
  const neighbours = new Map<number, Set<number>>();
  const top = data.regions[1]!;
  for (let t = 0; t < top.length; t += 3) {
    const triangle = [top[t]!, top[t + 1]!, top[t + 2]!];
    for (const i of triangle) {
      if (!neighbours.has(i)) neighbours.set(i, new Set());
      for (const j of triangle) if (i !== j) neighbours.get(i)!.add(j);
    }
  }
  let previous = vertices.slice();
  for (let pass = 0; pass < 20; pass++) {
    for (const [i, adjacent] of neighbours) {
      if (otherRegions.has(i)) continue;
      for (const axis of [0, 2]) {
        let sum = 0;
        for (const j of adjacent) sum += previous[j * 3 + axis]!;
        vertices[i * 3 + axis] = previous[i * 3 + axis]! * .6 + sum / adjacent.size * .4;
      }
    }
    previous = vertices.slice();
  }
  // Expand along the surface, not away from the world origin: the latter
  // flared the sleeve edges and introduced a ridge along the shirt's sides.
  if (outfit !== 'fitted') {
    const shell = new T.BufferGeometry();
    shell.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    shell.setIndex(data.regions.flat()); shell.computeVertexNormals();
    const normals = shell.getAttribute('normal');
    for (const i of fabricVertices) {
      const y = vertices[i * 3 + 1]!;
      const ease = outfit === 'relaxed' ? .021 : .010;
      const fade = 1 - T.MathUtils.smoothstep(y, 1.48, 1.575);
      vertices[i * 3] = vertices[i * 3]! + normals.getX(i) * ease * fade;
      vertices[i * 3 + 2] = vertices[i * 3 + 2]! + normals.getZ(i) * ease * fade;
    }
    shell.dispose();
  }
  for (const i of trouserVertices) {
    const y = vertices[i * 3 + 1]!;
    if (y < .115 || y > .8) continue;
    const start = vertices[i * 3]! > 0 ? 4 : 10;
    const from = data.bones[y >= data.bones[start + 1]![1]! ? start : start + 1]!;
    const to = data.bones[y >= data.bones[start + 1]![1]! ? start + 1 : start + 2]!;
    const t = T.MathUtils.clamp((y - from[1]!) / (to[1]! - from[1]!), 0, 1);
    const center = shape(T.MathUtils.lerp(from[0]!, to[0]!, t), y, T.MathUtils.lerp(from[2]!, to[2]!, t));
    const dx = vertices[i * 3]! - center.x; const dz = vertices[i * 3 + 2]! - center.z;
    const radius = Math.hypot(dx, dz);
    const minimum = (outfit === 'relaxed' ? .065 : .052) + T.MathUtils.smoothstep(y, .25, .7) * .018;
    const ease = Math.max(1, minimum / Math.max(radius, .001));
    vertices[i * 3] = center.x + dx * ease;
    vertices[i * 3 + 2] = center.z + dz * ease;
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(data.skinIndices, 4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(data.skinWeights, 4));
  const uv = vertices.flatMap((_, i) => i % 3 === 0 ? [vertices[i]! * 3, vertices[i + 1]! * 3] : []);
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  const indices: number[] = [];
  data.regions.forEach((region, material) => { if (material === 3) return; geometry.addGroup(indices.length, region.length, material); indices.push(...region); });
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const mesh = new T.SkinnedMesh(geometry, materials); mesh.castShadow = true; mesh.receiveShadow = true;
  const points = data.bones.map(p => shape(p[0]!, p[1]!, p[2]!));
  const bones = points.map(() => new T.Bone());
  bones.forEach((bone, i) => {
    const parent = data.parents[i]!;
    bone.position.copy(points[i]!);
    if (parent >= 0) { bone.position.sub(points[parent]!); bones[parent]!.add(bone); }
    else mesh.add(bone);
  });
  mesh.updateMatrixWorld(true);
  const skeleton = new T.Skeleton(bones); mesh.bind(skeleton); mesh.normalizeSkinWeights();
  const shoeGeometries: T.BufferGeometry[] = [];
  const soleMaterial = new T.MeshStandardMaterial({ color: '#e6dfcd', roughness: .8 });
  const shoeMaterials: T.Material[] = [soleMaterial];
  const footprint = new T.Shape();
  footprint.moveTo(-.043, .055); footprint.quadraticCurveTo(0, .075, .043, .055);
  footprint.lineTo(.055, -.10); footprint.quadraticCurveTo(.056, -.19, 0, -.195);
  footprint.quadraticCurveTo(-.056, -.19, -.055, -.10); footprint.closePath();
  function shoePart(depth: number, bevel: number) {
    const geo = new T.ExtrudeGeometry(footprint, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1, curveSegments: 12 });
    geo.rotateX(-Math.PI / 2); shoeGeometries.push(geo); return geo;
  }
  const soleGeo = shoePart(.015, .006); const upperGeo = shoePart(.051, .012);
  const upperPositions = upperGeo.getAttribute('position');
  for (let i = 0; i < upperPositions.count; i++) {
    const toe = T.MathUtils.smoothstep(upperPositions.getZ(i), .035, .18);
    upperPositions.setY(i, upperPositions.getY(i) * (1 - toe * .48));
  }
  upperGeo.computeVertexNormals();
  const laceGeo = new T.BoxGeometry(.071, .003, .006); shoeGeometries.push(laceGeo);
  for (const index of [6, 12]) {
    const foot = new T.Group(); foot.position.y = -points[index]!.y + .01;
    const sole = new T.Mesh(soleGeo, soleMaterial); const upper = new T.Mesh(upperGeo, materials[3]); upper.position.y = .029;
    sole.castShadow = upper.castShadow = true; foot.add(sole, upper);
    for (let j = 0; j < 4; j++) { const lace = new T.Mesh(laceGeo, soleMaterial); lace.position.set(0, .09 - j * .003, .025 + j * .016); foot.add(lace); }
    bones[index]!.add(foot);
  }
  const restingArmAngles = [1, 7].map(i => {
    const direction = points[i + 1]!.clone().sub(points[i]!);
    const side = Math.sign(direction.x);
    return (side > 0 ? -1.43 : -Math.PI + 1.43) - Math.atan2(direction.y, direction.x);
  });
  const legAngles = [4, 10].map(i => {
    const direction = points[i + 2]!.clone().sub(points[i]!);
    const targetX = points[i]!.x * (a.frame === 'feminine' ? .78 : 1.03);
    return Math.atan2(direction.y, targetX - points[i]!.x) - Math.atan2(direction.y, direction.x);
  });
  // Finger joints retain the source skin weights instead of moving as one rigid palm.
  for (let i = 13; i < bones.length; i++) {
    const name = data.boneNames[i]!;
    const match = /finger(\d)-(\d)\.(L|R)/.exec(name);
    if (!match) continue;
    const digit = Number(match[1]); const segment = Number(match[2]);
    const side = match[3] === 'L' ? 1 : -1;
    const axis = new T.Vector3(side * .85, .25, .45).normalize();
    bones[i]!.quaternion.setFromAxisAngle(axis, digit === 1 ? .12 : segment === 1 ? .12 : segment === 2 ? .32 : .20);
  }
  function animate(time: number, walking: boolean, reduced: boolean, pose: CharacterPose = 'natural') {
    const phase = reduced ? 0 : time * 5.8;
    const feminine = a.frame === 'feminine';
    const styled = !walking && pose !== 'relaxed';
    for (const [side, start] of [1, 7].entries()) {
      const sign = side === 0 ? 1 : -1;
      const swing = walking ? Math.sin(phase + side * Math.PI) : 0;
      bones[start]!.rotation.set(swing * .16, 0, restingArmAngles[side]! + sign * (pose === 'confident' && !walking ? .055 : 0));
      bones[start + 1]!.rotation.set(.14 - swing * .08, 0, 0);
      bones[start + 2]!.rotation.set(.025, sign * .08, sign * -.035);
      if (styled && side === 0 && (feminine || pose === 'confident')) {
        const shoulder = points[start]!; const elbow = points[start + 1]!; const wrist = points[start + 2]!;
        const target = new T.Vector2(sign * (.24 + a.hips * .045), 1.10);
        const origin = new T.Vector2(shoulder.x, shoulder.y);
        const upper = new T.Vector2(elbow.x - shoulder.x, elbow.y - shoulder.y);
        const lower = new T.Vector2(wrist.x - elbow.x, wrist.y - elbow.y);
        const delta = target.clone().sub(origin); const distance = delta.length();
        const opening = Math.acos(T.MathUtils.clamp((upper.lengthSq() + distance * distance - lower.lengthSq()) / (2 * upper.length() * distance), -1, 1));
        const angle = Math.atan2(delta.y, delta.x) + opening;
        const joint = origin.clone().add(new T.Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(upper.length()));
        const forearmAngle = Math.atan2(target.y - joint.y, target.x - joint.x);
        const upperTurn = angle - Math.atan2(upper.y, upper.x);
        bones[start]!.rotation.set(0, 0, upperTurn);
        bones[start + 1]!.rotation.set(.08, 0, forearmAngle - Math.atan2(lower.y, lower.x) - upperTurn);
        bones[start + 2]!.rotation.set(.08, -.12, .28);
      }
      const restingLeg = styled && feminine && side === 1 ? -.055 : 0;
      bones[start + 3]!.rotation.set(-swing * .31 + restingLeg, 0, legAngles[side]!, 'ZXY');
      bones[start + 4]!.rotation.set(walking ? Math.max(0, swing) * .48 : -restingLeg * 1.4, 0, 0);
      bones[start + 5]!.rotation.set(walking ? -Math.max(0, swing) * .16 : -restingLeg * .4, 0, -legAngles[side]!);
    }
  }
  animate(0, false, true);
  return { mesh, animate, dispose() { skeleton.dispose(); geometry.dispose(); shoeGeometries.forEach(g => g.dispose()); shoeMaterials.forEach(m => m.dispose()); } };
}
