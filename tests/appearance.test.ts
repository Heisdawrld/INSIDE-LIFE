import { describe, expect, it } from 'vitest';
import { BODY_PRESETS, DEFAULT_APPEARANCE, validAppearance } from '../src/game/appearance';
import { decodeSave } from '../src/game/save';
import { newGame } from '../src/game/simulation';
import headData from '../src/assets/human-head.json';

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
  it.each([{ hips: -1 }, { chest: 1.01 }, { height: NaN }, { build: Infinity }, { face: '0.5' }, { hair: 'unknown' }, { skin: 'url(external)' }, { frame: 'unknown' }])('rejects invalid appearance %j', patch => {
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
