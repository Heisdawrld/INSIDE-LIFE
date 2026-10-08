import { describe, expect, it } from 'vitest';
import { BODY_PRESETS, DEFAULT_APPEARANCE, validAppearance } from '../src/game/appearance';
import { decodeSave } from '../src/game/save';
import { newGame } from '../src/game/simulation';
import headData from '../src/assets/human-head.json';
import bodyData from '../src/assets/human-body.json';
import { createBody } from '../src/render/body';
import { MeshStandardMaterial, Vector3 } from 'three';

describe('character save compatibility', () => {
  it('migrates legacy saves without changing progress or funds', () => {
    const state = newGame(); state.balance = 9100; state.meals = 2;
    const { appearance: _, ...legacy } = state;
    const restored = decodeSave(JSON.stringify({ ...legacy, version: 1 }));
    expect(restored).toEqual({ ...state, appearance: DEFAULT_APPEARANCE });
  });
  it('round trips every shape without changing economic state', () => {
    for (const preset of Object.values(BODY_PRESETS)) {
      const state = newGame(); state.appearance = { ...DEFAULT_APPEARANCE, ...preset };
      expect(validAppearance(state.appearance)).toBe(true);
      expect(decodeSave(JSON.stringify(state))).toEqual(state);
    }
  });
  it.each([{ hips: -1 }, { chest: 1.01 }, { height: NaN }, { build: Infinity }, { face: '0.5' }, { hair: 'unknown' }, { skin: 'url(external)' }, { frame: 'unknown' }, { outfit: 'unknown' }])('rejects invalid appearance %j', patch => {
    const appearance = { ...DEFAULT_APPEARANCE, ...patch };
    expect(validAppearance(appearance)).toBe(false);
    expect(decodeSave(JSON.stringify({ ...newGame(), appearance }))).toBeNull();
  });
  it('keeps new characters independent from defaults and each other', () => {
    const a = newGame(); const b = newGame(); a.appearance.hips = 1;
    expect(b.appearance.hips).toBe(DEFAULT_APPEARANCE.hips);
  });
});

describe('imported head geometry', () => {
  it('contains finite, indexed, head-only meshes for both frames', () => {
    for (const data of Object.values(headData)) {
      expect(data.positions.length % 3).toBe(0);
      expect(data.indices.length % 3).toBe(0);
      expect(data.positions.every(Number.isFinite)).toBe(true);
      expect(data.indices.every(i => Number.isInteger(i) && i >= 0 && i < data.positions.length / 3)).toBe(true);
      expect(data.positions.filter((_, i) => i % 3 === 1).every(y => y >= 1.6 && y <= 1.87)).toBe(true);
      expect(data.eyes).toHaveLength(2);
    }
  });
});

describe('continuous body rig', () => {
  it('has normalized influences and an ordered bone hierarchy', () => {
    for (const data of Object.values(bodyData)) {
      expect(data.mass.length).toBe(data.positions.length);
      expect(data.skinWeights.length).toBe(data.positions.length / 3 * 4);
      data.parents.forEach((parent, i) => expect(parent).toBeLessThan(i));
      for (let i = 0; i < data.skinWeights.length; i += 4) {
        expect(data.skinWeights.slice(i, i + 4).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
      }
      expect(data.skinIndices.every(i => Number.isInteger(i) && i >= 0 && i < data.bones.length)).toBe(true);
      expect(data.regions.flat().every(i => Number.isInteger(i) && i >= 0 && i < data.positions.length / 3)).toBe(true);
    }
  });
  it('keeps all presets finite through a full walk cycle, including extreme proportions', () => {
    const materials = Array.from({ length: 4 }, () => new MeshStandardMaterial());
    const presets = [...Object.values(BODY_PRESETS), { ...BODY_PRESETS.curvy!, build: 1, waist: 0, hips: 1, chest: 1 }];
    for (const preset of presets) {
      const body = createBody({ ...DEFAULT_APPEARANCE, ...preset }, materials);
      const positions = body.mesh.geometry.getAttribute('position');
      const point = new Vector3();
      for (let time = 0; time < 1; time += .125) {
        body.animate(time, true, false); body.mesh.updateMatrixWorld(true); body.mesh.skeleton.update();
        for (let i = 0; i < positions.count; i += 7) {
          point.fromBufferAttribute(positions, i); body.mesh.applyBoneTransform(i, point);
          expect(point.toArray().every(Number.isFinite)).toBe(true);
          expect(point.length()).toBeLessThan(3);
        }
      }
      body.dispose();
    }
    materials.forEach(m => m.dispose());
  });
  it('produces identical poses at equal times and a stable reduced-motion pose', () => {
    const materials = Array.from({ length: 4 }, () => new MeshStandardMaterial());
    const body = createBody(DEFAULT_APPEARANCE, materials);
    body.animate(1, true, false); const pose = body.mesh.skeleton.bones.map(b => b.rotation.toArray());
    body.animate(2, true, false); body.animate(1, true, false);
    expect(body.mesh.skeleton.bones.map(b => b.rotation.toArray())).toEqual(pose);
    body.animate(1, true, true); const still = body.mesh.skeleton.bones.map(b => b.rotation.toArray());
    body.animate(100, true, true); expect(body.mesh.skeleton.bones.map(b => b.rotation.toArray())).toEqual(still);
    body.dispose(); materials.forEach(m => m.dispose());
  });
});


describe('studio wardrobe and stance', () => {
  it('preserves all wardrobe cuts and still accepts earlier v2 appearances', () => {
    for (const outfit of [undefined, 'fitted', 'relaxed', 'tailored'] as const) {
      const state = newGame();
      if (outfit) state.appearance.outfit = outfit;
      expect(decodeSave(JSON.stringify(state))).toEqual(state);
    }
  });
  it('keeps feet below the hips without crossing in each studio pose', () => {
    const materials = Array.from({ length: 4 }, () => new MeshStandardMaterial());
    for (const preset of Object.values(BODY_PRESETS)) {
      const body = createBody({ ...DEFAULT_APPEARANCE, ...preset }, materials);
      for (const pose of ['natural', 'confident', 'relaxed'] as const) {
        body.animate(0, false, true, pose); body.mesh.updateMatrixWorld(true);
        const left = body.mesh.skeleton.bones[6]!.getWorldPosition(new Vector3());
        const right = body.mesh.skeleton.bones[12]!.getWorldPosition(new Vector3());
        expect(left.x).toBeGreaterThan(0); expect(right.x).toBeLessThan(0);
        expect(left.x - right.x).toBeLessThan(.36);
        expect(Math.abs(left.y - right.y)).toBeLessThan(.035);
      }
      body.dispose();
    }
    materials.forEach(m => m.dispose());
  });
});
