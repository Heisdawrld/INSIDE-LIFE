import * as T from 'three';
import { PLACES } from '../game/world';
import type { Point, PlaceId } from '../game/world';
import type { GameState } from '../game/simulation';
import { DEFAULT_APPEARANCE } from '../game/appearance';
import type { Appearance } from '../game/appearance';
import { createCharacter } from './character';
import type { Character } from './character';

export interface SceneView {
  canvas: HTMLCanvasElement;
  render(state: GameState, seconds: number, moving: boolean, reducedMotion: boolean): void;
  pick(clientX: number, clientY: number): Point | null;
  labels(): { id: PlaceId; x: number; y: number; visible: boolean }[];
  resize(): void;
  zoom(delta: number): void;
  quality(low: boolean): void;
  dispose(): void;
}

export function createScene(host: HTMLElement): SceneView {
  const scene = new T.Scene();
  scene.background = new T.Color('#d5ded4');
  scene.fog = new T.Fog('#d5ded4', 55, 125);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', 'Orita Street. Click the ground to walk, or use the destination buttons.');
  renderer.domElement.tabIndex = 0;
  host.append(renderer.domElement);

  const camera = new T.OrthographicCamera(-25, 25, 20, -20, .1, 180);
  camera.position.set(29, 37, 43);
  camera.lookAt(0, 0, 0);
  let zoom = 1;
  let lowQuality = false;
  const materials = new Map<string, T.MeshStandardMaterial>();
  const geometries = new Set<T.BufferGeometry>();
  const textures = new Set<T.Texture>();
  const boxGeometry = new T.BoxGeometry(1, 1, 1); geometries.add(boxGeometry);
  const sphereGeometry = new T.SphereGeometry(1, 10, 8); geometries.add(sphereGeometry);
  const cylinderGeometry = new T.CylinderGeometry(1, 1, 1, 12); geometries.add(cylinderGeometry);
  const mat = (color: string, roughness = .85) => {
    const key = `${color}-${roughness}`;
    if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness }));
    return materials.get(key)!;
  };
  function mesh(geo: T.BufferGeometry, color: string, pos: number[], scale: number[], parent: T.Object3D = scene) {
    const object = new T.Mesh(geo, mat(color));
    object.position.set(pos[0]!, pos[1]!, pos[2]!); object.scale.set(scale[0]!, scale[1]!, scale[2]!);
    object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, c: string, p: T.Object3D = scene) => mesh(boxGeometry, c, [x, y, z], [w, h, d], p);
  const sphere = (x: number, y: number, z: number, r: number, c: string, p: T.Object3D = scene) => mesh(sphereGeometry, c, [x, y, z], [r, r, r], p);
  const cylinder = (x: number, y: number, z: number, r: number, h: number, c: string, p: T.Object3D = scene) => mesh(cylinderGeometry, c, [x, y, z], [r, h, r], p);
  function sign(text: string, x: number, y: number, z: number, w: number, background = '#204a42', fg = '#fff4d7', h = .75) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = background; ctx.fillRect(0, 0, 768, 128);
    ctx.fillStyle = fg; ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 68, 735);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; textures.add(texture);
    const material = new T.MeshStandardMaterial({ map: texture, roughness: 1 });
    materials.set(`sign-${materials.size}`, material);
    const geometry = new T.PlaneGeometry(w, h); geometries.add(geometry);
    const m = new T.Mesh(geometry, material); m.position.set(x, y, z); scene.add(m); return m;
  }

  scene.add(new T.HemisphereLight('#fff2d0', '#78917a', 2.4));
  const sun = new T.DirectionalLight('#fff0d1', 3.2);
  sun.position.set(-22, 36, 15); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 30, bottom: -30, far: 100 });
  sun.shadow.normalBias = .035; scene.add(sun);

  // A compact, walkable diorama: the courtyard and street share one simulation space.
  box(0, -.45, 0, 43, .8, 36, '#a6b298');
  box(-7, -.02, 1, 21, .16, 29, '#c5b08c');
  box(6, .025, 0, 6, .16, 35, '#52615e');
  for (let z = -16; z < 18; z += 3) box(6, .115, z, .12, .02, 1.3, '#d9ceb0');
  for (const x of [2.75, 9.25]) {
    box(x, .16, 0, .4, .3, 34, '#d2cdb7');
    box(x + (x < 6 ? -.55 : .55), .06, 0, .6, .08, 34, '#7a8175');
    for (let z = -15; z < 16; z += 2.5) box(x, .32, z, .42, .025, .9, '#525f53');
  }
  for (let z = -.8; z < 1.4; z += .45) box(6, .12, z, 5.4, .02, .23, '#e6dfc5');
  box(13.5, -.01, 0, 8, .2, 31, '#cbb995');
  // Potholes and repair edges are visual in this first slice, not random damage triggers.
  const hole = cylinder(7.5, .12, 5, .65, .015, '#374644'); hole.scale.z = .43;
  cylinder(7.5, .14, 5, .37, .02, '#7c908b');

  // Cutaway starter room. Open foreground avoids camera occlusion.
  box(-10.5, .11, -7, 11, .22, 8, '#e0d1af');
  for (let x = -15.5; x < -5; x += 1) for (let z = -10.5; z < -3; z += 1) {
    box(x, .235, z, .985, .025, .985, (Math.round(x + z) % 2 === 0) ? '#ddc8a2' : '#d4bd96');
  }
  box(-10.5, 1.9, -11, 11, 3.8, .28, '#dbb784');
  box(-16, 1.9, -7, .28, 3.8, 8, '#c89d71');
  box(-5, 1.9, -8, .28, 3.8, 6, '#e0c598');
  box(-10.5, .5, -10.8, 10.5, .4, .06, '#9b7658');
  box(-9.7, 2.2, -10.8, 2.3, 1.6, .1, '#497b79');
  for (const x of [-10.65, -9.7, -8.75]) box(x, 2.2, -10.65, .06, 1.55, .09, '#ecd4a6');
  box(-9.7, 2.2, -10.64, 2.3, .07, .09, '#ecd4a6');
  box(-13.5, .48, -8.5, 2.2, .5, 3.4, '#825b44');
  box(-13.5, .87, -8.5, 2.1, .35, 3.3, '#f3e8c9');
  box(-13.5, 1.07, -8, 2.13, .08, 2.25, '#418278');
  for (let z = -8.9; z < -7; z += .35) box(-13.5, 1.12, z, 2.13, .015, .08, '#afc3a0');
  box(-13.5, 1.12, -9.55, 1.5, .22, .58, '#f5e9cf');
  box(-7, .95, -9.5, 2, .12, 1.3, '#875c40');
  for (const x of [-7.8, -6.2]) for (const z of [-9.95, -9.05]) box(x, .55, z, .1, .85, .1, '#614a37');
  box(-7.2, 1.05, -9.5, .4, .06, .6, '#d2aa59');
  box(-6.6, 1.2, -9.6, .24, .3, .24, '#e7dac0');
  sign('ROOM 04', -7.2, 2.65, -10.8, 2, '#bd9159', '#3c4a3c', .5);
  // Fan upgrade starts hidden and is enabled only by the simulation.
  const fan = new T.Group(); fan.position.set(-6.3, .2, -5.7); scene.add(fan);
  cylinder(0, .1, 0, .42, .12, '#304e48', fan); cylinder(0, .8, 0, .045, 1.4, '#c6c5ad', fan);
  const cage = new T.Mesh(new T.TorusGeometry(.43, .045, 6, 24), mat('#304e48')); geometries.add(cage.geometry); cage.position.y = 1.6; fan.add(cage);
  const blades = new T.Group(); blades.position.y = 1.6; fan.add(blades);
  for (let i = 0; i < 3; i++) { const blade = box(0, .18, 0, .17, .39, .045, '#517c70', blades); blade.rotation.z = i * Math.PI * 2 / 3; blade.position.set(Math.sin(i * Math.PI * 2 / 3) * .17, Math.cos(i * Math.PI * 2 / 3) * .17, 0); }

  // Shared compound: water storage, washing line, generator and shaded seating.
  cylinder(-3, 1.45, -3, .95, 2.7, '#385a58'); cylinder(-3, 2.86, -3, 1, .13, '#294a47');
  for (const y of [.45, 1, 1.6, 2.2]) cylinder(-3, y, -3, .97, .055, '#2e4d4a');
  cylinder(-3.5, .35, -1.1, .3, .55, '#bd8357');
  box(-14, .48, -.5, 1.3, .9, .9, '#b38645'); box(-14, 1, -.5, 1.1, .15, .8, '#384a43');
  box(-7, .6, 6.8, 3, .15, .9, '#78583f');
  for (const x of [-8.1, -5.9]) box(x, .3, 6.8, .2, .6, .7, '#68503d');
  for (const x of [-15, -6]) cylinder(x, 2.1, 2.5, .065, 4, '#746951');
  box(-10.5, 3.9, 2.5, 9, .035, .035, '#e4dabe');
  for (let i = 0; i < 4; i++) { box(-13.8 + i * 1.6, 3.35, 2.5, 1, 1.1, .04, ['#c16c51', '#efe3c5', '#658f83', '#d4b15b'][i]!); }
  sign('ORITA STREET', -.6, 2.7, 12.2, 4, '#244f45', '#f0dab1', .8);
  cylinder(-2.5, 1.4, 12.2, .065, 2.8, '#6f7059');

  function shop(x: number, z: number, color: string, title: string) {
    box(x, 1.75, z, 6, 3.5, 4, color);
    box(x, 1.5, z + 2.03, 4.8, 2.8, .08, '#344e45');
    box(x, 3.7, z, 6.6, .25, 4.6, '#697564');
    const canopy = box(x, 2.9, z + 2.8, 6.6, .16, 2.1, '#c99455'); canopy.rotation.x = .1;
    for (let i = 0; i < 6; i++) box(x - 2.8 + i * 1.12, 2.89, z + 2.8, .54, .19, 2.1, '#e8d3a5').rotation.x = .1;
    sign(title, x, 3.15, z + 2.1, 5.5, '#244f45', '#f1dfb0', .72);
    for (const side of [-1, 1]) cylinder(x + side * 2.9, 1.4, z + 3.65, .055, 2.8, '#745c43');
  }
  shop(14, -7, '#cf9d6c', 'MAMA T · PROVISIONS');
  box(14, .85, -4.5, 4.6, 1.6, .85, '#9e704a');
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
    sphere(12.3 + i * .65, 1.78 + j * .25, -4.5, .22, i % 2 ? '#dca944' : '#b96543');
  }
  for (let i = 0; i < 3; i++) box(12.6 + i, 1, -5.8, .6, 1.8, .7, ['#d7b667', '#b45d46', '#e3d4a8'][i]!);
  shop(14, 10.5, '#809787', 'TUNDE · AUTO REPAIRS');
  box(14, .7, 8.2, 3.4, .12, 1.2, '#8b7659');
  for (const x of [12.6, 15.4]) box(x, .35, 8.2, .12, .7, .8, '#4a5449');
  for (let i = 0; i < 3; i++) { const tire = cylinder(16.3, .25 + i * .35, 7.8, .58, .3, '#36413b'); tire.receiveShadow = true; }
  box(12.7, .95, 8.1, .7, .35, .5, '#b76348');
  // Background houses give context without loading an entire city.
  for (let i = 0; i < 5; i++) {
    const x = -19 + i * 9;
    box(x, 2.6, -17, 7.5, 5.2, 4, ['#9caa92', '#c1ad87', '#b68d6a', '#88a39a', '#b4af89'][i]!);
    box(x, 5.3, -17, 8.1, .25, 4.6, '#687a6e');
    for (const dx of [-2.3, 0, 2.3]) for (const y of [1.5, 3.8]) box(x + dx, y, -14.96, 1.1, 1.2, .04, '#4b6c66');
  }

  function tree(x: number, z: number, scale = 1) {
    cylinder(x, 1.8 * scale, z, .18 * scale, 3.6 * scale, '#7a6247');
    for (let i = 0; i < 5; i++) sphere(x + Math.sin(i * 2) * .85 * scale, (3.7 + (i % 2) * .6) * scale, z + Math.cos(i * 2) * .7 * scale, (1.2 + i % 2 * .2) * scale, ['#658966', '#78965f', '#577d62'][i % 3]!);
  }
  tree(-13, 8, 1.35); tree(-17, -12, 1.1); tree(18, 2, 1); tree(-3, 14, .85);
  for (let i = 0; i < 8; i++) {
    const x = -15 + i * 2; cylinder(x, .35, -12, .28, .65, '#b18558'); sphere(x, .9, -12, .5, '#6c8655');
  }
  // Utility poles and overhead wire silhouettes.
  for (const z of [-11, 11]) {
    cylinder(2, 3.3, z, .1, 6.6, '#80765f'); box(2, 6.3, z, 2, .12, .13, '#5a6658');
  }
  for (const x of [1.3, 2.7]) {
    const points = [new T.Vector3(x, 6.3, -11), new T.Vector3(x, 5.7, 0), new T.Vector3(x, 6.3, 11)];
    const geometry = new T.BufferGeometry().setFromPoints(points); geometries.add(geometry);
    const material = new T.LineBasicMaterial({ color: '#596556' });
    const line = new T.Line(geometry, material); scene.add(line);
  }

  function person(shirt: string, skin: string, x: number, z: number, appearance: Appearance = DEFAULT_APPEARANCE): Character {
    const character = createCharacter({ ...appearance, skin }, shirt);
    character.group.position.set(x, .25, z); scene.add(character.group); return character;
  }
  let player = person('#db9b46', '#77452d', -9, -2);
  let appearanceSignature = '';
  const ringGeometry = new T.RingGeometry(.48, .55, 36); geometries.add(ringGeometry);
  const ringMaterial = new T.MeshBasicMaterial({ color: '#f4cf75', side: T.DoubleSide });
  const ring = new T.Mesh(ringGeometry, ringMaterial); ring.rotation.x = -Math.PI / 2; ring.position.y = .025; player.group.add(ring);
  const bisi = person('#987761', '#5b3526', -6, 6, { ...DEFAULT_APPEARANCE, frame: 'feminine', build: .65, hips: .7, chest: .6, hair: 'bun' });
  const mama = person('#ae7050', '#77452d', 13.2, -5.6, { ...DEFAULT_APPEARANCE, frame: 'feminine', build: .8, waist: .7, hips: .7, hair: 'locs' });
  const tunde = person('#4e776e', '#805837', 13, 7.2);
  const walkers = [person('#c3b28d', '#543827', 1.1, 4), person('#7c9199', '#775239', 10, -11)];
  // A passing danfo: visual traffic never arbitrarily takes money or injures a player.
  const bus = new T.Group(); scene.add(bus);
  box(0, .8, 0, 1.6, 1.1, 3.5, '#dcaa45', bus);
  box(0, 1.45, -.1, 1.55, .65, 2.65, '#dcb54d', bus);
  box(0, 1.48, 1.24, 1.35, .46, .04, '#436865', bus);
  for (const side of [-1, 1]) {
    for (const z of [-.8, 0, .8]) box(side * .785, 1.47, z, .03, .4, .55, '#3e6360', bus);
    box(side * .815, .91, 0, .025, .14, 3.35, '#34443c', bus);
    for (const z of [-1.12, 1.12]) { const tire = cylinder(side * .81, .4, z, .36, .15, '#2b3832', bus); tire.rotation.z = Math.PI / 2; }
  }
  for (const x of [-.53, .53]) box(x, .76, 1.77, .28, .19, .025, '#f4e2b2', bus);

  const raycaster = new T.Raycaster(); const ground = new T.Plane(new T.Vector3(0, 1, 0), 0); const projected = new T.Vector3();
  let lastPosition = new T.Vector3(-9, 0, -2);
  function resize() {
    const w = host.clientWidth; const h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h); const aspect = w / h;
    const halfH = aspect < .8 ? 23 : 20;
    camera.left = -halfH * aspect; camera.right = halfH * aspect; camera.top = halfH; camera.bottom = -halfH;
    camera.zoom = zoom; camera.updateProjectionMatrix();
  }
  resize();
  return {
    canvas: renderer.domElement,
    render(state, seconds, moving, reducedMotion) {
      const nextAppearance = JSON.stringify([state.appearance, state.shirt]);
      if (nextAppearance !== appearanceSignature) {
        appearanceSignature = nextAppearance;
        scene.remove(player.group); player.dispose();
        player = person(state.shirt, state.appearance.skin, state.position.x, state.position.z, state.appearance);
        player.group.add(ring);
      }
      const p = state.position;
      if (host.clientWidth <= 760) {
        camera.position.set(29 + p.x, 37, 43 + p.z);
        camera.lookAt(p.x, 0, p.z);
      } else {
        camera.position.set(29, 37, 43);
        camera.lookAt(0, 0, 0);
      }
      const dx = p.x - lastPosition.x; const dz = p.z - lastPosition.z;
      if (Math.hypot(dx, dz) > .001) player.group.rotation.y = Math.atan2(dx, dz);
      lastPosition = new T.Vector3(p.x, 0, p.z);
      player.group.position.set(p.x, .25, p.z);
      player.animate(seconds, moving, reducedMotion);
      fan.visible = state.fan; if (!reducedMotion) blades.rotation.z = seconds * 12;
      bisi.group.rotation.y = -.4; mama.group.rotation.y = -.4; tunde.group.rotation.y = -1.2;
      if (!reducedMotion) walkers.forEach((person, i) => {
        const phase = seconds * .7 + i * 18;
        const z = ((phase % 48) < 24 ? phase % 24 : 24 - phase % 24) - 12;
        person.group.position.z = z; person.group.rotation.y = phase % 48 < 24 ? 0 : Math.PI; person.animate(seconds, true, reducedMotion);
      });
      bus.position.set(4.65, .13, reducedMotion ? -13 : (seconds * 2.3 % 48) - 24);
      const night = (state.minute % 1440) > 1110 || (state.minute % 1440) < 360;
      sun.intensity = night ? .8 : 3.2;
      renderer.render(scene, camera);
    },
    pick(clientX, clientY) {
      const r = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new T.Vector2((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1), camera);
      const hit = raycaster.ray.intersectPlane(ground, new T.Vector3());
      return hit ? { x: hit.x, z: hit.z } : null;
    },
    labels() {
      return PLACES.map(p => {
        projected.set(p.point.x, 2.7, p.point.z).project(camera);
        return { id: p.id, x: (projected.x + 1) / 2 * host.clientWidth, y: (-projected.y + 1) / 2 * host.clientHeight, visible: Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 };
      });
    },
    resize,
    zoom(delta) { zoom = T.MathUtils.clamp(zoom + delta, .65, 1.65); resize(); },
    quality(low) { lowQuality = low; renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowQuality ? 1 : 1.5)); renderer.shadowMap.enabled = !low; resize(); },
    dispose() {
      [player, bisi, mama, tunde, ...walkers].forEach(p => p.dispose());
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); ringMaterial.dispose();
      scene.traverse(o => { if (o instanceof T.Line) (o.material as T.Material).dispose(); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
