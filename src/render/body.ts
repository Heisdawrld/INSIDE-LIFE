import * as T from 'three';
import bodyData from '../assets/human-body.json';
import type { Appearance } from '../game/appearance';

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
    const width = 1 + fullness * upper + (a.hips - .35) * .38 * hip + (a.waist - .45) * .36 * waist * torso + (a.chest - .45) * .17 * chest;
    const depth = 1 + fullness * upper + (a.hips - .35) * .28 * hip + (a.waist - .45) * .4 * waist * torso + (a.chest - .45) * (a.frame === 'feminine' ? .4 : .2) * chest * torso;
    const neck = T.MathUtils.smoothstep(y, 1.48, 1.6);
    return new T.Vector3(x * T.MathUtils.lerp(width, 1, neck), y, z * T.MathUtils.lerp(depth, 1, neck));
  }
  const vertices: number[] = [];
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
  function animate(time: number, walking: boolean, reduced: boolean) {
    const phase = reduced ? 0 : time * 7.5;
    for (const [side, start] of [1, 7].entries()) {
      const swing = walking ? Math.sin(phase + side * Math.PI) : 0;
      bones[start]!.rotation.set(swing * .2, 0, restingArmAngles[side]!);
      bones[start + 1]!.rotation.x = .38 - Math.max(0, -swing) * .12;
      bones[start + 3]!.rotation.x = -swing * .3;
      bones[start + 4]!.rotation.x = Math.max(0, swing) * .38;
      bones[start + 5]!.rotation.x = -Math.max(0, swing) * .1;
    }
  }
  animate(0, false, true);
  return { mesh, animate, dispose() { skeleton.dispose(); geometry.dispose(); shoeGeometries.forEach(g => g.dispose()); shoeMaterials.forEach(m => m.dispose()); } };
}
