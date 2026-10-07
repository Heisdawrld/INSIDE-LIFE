import { describe, expect, it } from 'vitest';
import { ACTIONS, FIXED_STEP, Simulation, newGame, objectives } from '../src/game/simulation';
import type { ActionId } from '../src/game/simulation';
import { PLACES, distance, findPath, isWalkable, place } from '../src/game/world';
import { SAVE_KEY, decodeSave, loadSave, saveGame } from '../src/game/save';

function run(sim: Simulation, seconds: number) { for (let i = 0; i < Math.ceil(seconds / FIXED_STEP); i++) sim.tick(FIXED_STEP); }
function act(sim: Simulation, id: ActionId) {
  sim.state.position = { ...place(ACTIONS[id].place).point };
  const result = sim.start(id); expect(result.ok, result.message).toBe(true); run(sim, ACTIONS[id].seconds + .1);
}
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
}

describe('first-day economy and activities', () => {
  it('starts everyone with modest virtual funds, no debt and no purchased upgrade', () => {
    const s = newGame(); expect(s.balance).toBe(12500); expect(s.fan).toBe(false); expect(s.ledger).toEqual([]);
  });
  it('refuses remote purchases without moving or spending', () => {
    const sim = new Simulation(); expect(sim.start('eat').ok).toBe(false); expect(sim.state.balance).toBe(12500);
  });
  it('only charges for a completed activity, not a cancelled one', () => {
    const sim = new Simulation(); sim.state.position = { ...place('shop').point };
    expect(sim.start('eat').ok).toBe(true); run(sim, 1); sim.cancel(); run(sim, 5);
    expect(sim.state.balance).toBe(12500); expect(sim.state.meals).toBe(0); expect(sim.state.ledger).toHaveLength(0);
  });
  it('does not permit concurrent activities or overdrafts', () => {
    const sim = new Simulation(); sim.state.position = { ...place('shop').point }; sim.state.balance = 600;
    expect(sim.start('eat').ok).toBe(false); expect(sim.start('accept').ok).toBe(true); expect(sim.start('accept').ok).toBe(false);
  });
  it('requires the parcel and pays its delivery exactly once', () => {
    const sim = new Simulation(); sim.state.position = { ...place('mechanic').point };
    expect(sim.start('deliver').ok).toBe(false); act(sim, 'accept'); act(sim, 'deliver');
    expect(sim.state.balance).toBe(16000); expect(sim.start('deliver').ok).toBe(false); run(sim, 5);
    expect(sim.state.ledger).toHaveLength(1); expect(sim.state.balance).toBe(16000);
  });
  it('revalidates funds at commit rather than trusting a previous approval', () => {
    const sim = new Simulation(); sim.state.position = { ...place('room').point }; sim.start('fan'); sim.state.balance = 0;
    run(sim, 4); expect(sim.state.fan).toBe(false); expect(sim.state.balance).toBe(0);
  });
  it('cannot finish an activity after being moved away', () => {
    const sim = new Simulation(); sim.state.position = { ...place('shop').point }; sim.start('eat'); sim.state.position = { ...place('bed').point };
    run(sim, 5); expect(sim.state.meals).toBe(0); expect(sim.state.balance).toBe(12500);
  });
  it('supports the complete first chapter with an auditable balance', () => {
    const sim = new Simulation(); act(sim, 'chat'); act(sim, 'eat'); act(sim, 'accept'); act(sim, 'deliver'); act(sim, 'fan');
    expect(objectives(sim.state).every(o => o.done)).toBe(true);
    expect(sim.state.balance).toBe(10800); expect(sim.state.ledger.map(t => t.amount)).toEqual([-700, 3500, -4500]);
    expect(new Set(sim.state.ledger.map(t => t.id)).size).toBe(3);
    expect(sim.start('fan').ok).toBe(false);
  });
  it('the fan makes rest more effective while needs remain bounded', () => {
    const plain = new Simulation(); plain.state.needs.energy = 20; act(plain, 'rest');
    const improved = new Simulation(); improved.state.fan = true; improved.state.needs.energy = 20; act(improved, 'rest');
    expect(improved.state.needs.energy - plain.state.needs.energy).toBeCloseTo(15);
    act(improved, 'rest'); expect(improved.state.needs.energy).toBeLessThanOrEqual(100);
  });
  it('rejects time jumps and produces reproducible fixed-step results', () => {
    const a = new Simulation(); const b = new Simulation();
    a.tick(Infinity); a.tick(-1); a.tick(60); expect(a.state).toEqual(b.state);
    run(a, 30); run(b, 30); expect(a.state).toEqual(b.state);
  });
});

describe('walkability and navigation', () => {
  it('rejects buildings, invalid coordinates and world boundaries', () => {
    expect(isWalkable({ x: NaN, z: 0 })).toBe(false); expect(isWalkable({ x: 100, z: 0 })).toBe(false);
    expect(isWalkable({ x: -13.5, z: -8.5 })).toBe(false); expect(findPath(newGame().position, { x: 14, z: -7 })).toEqual([]);
  });
  it('finds traversable paths between every gameplay destination', () => {
    for (const from of PLACES) for (const to of PLACES) {
      const path = findPath(from.point, to.point);
      expect(path.length, `${from.id} → ${to.id}`).toBeGreaterThan(0);
      expect(path.every(isWalkable)).toBe(true);
      const sim = new Simulation(); sim.state.position = { ...from.point }; sim.walk(path); run(sim, 80);
      expect(distance(sim.state.position, to.point), `${from.id} → ${to.id}`).toBeLessThan(.1);
    }
  });
  it('reaches a far destination without crossing blocking objects', () => {
    const sim = new Simulation(); const path = findPath(sim.state.position, place('mechanic').point); sim.walk(path);
    for (let i = 0; i < 1000; i++) { sim.tick(FIXED_STEP); expect(isWalkable(sim.state.position)).toBe(true); }
    expect(distance(sim.state.position, place('mechanic').point)).toBeLessThan(.01);
  });
});

describe('save safety and recovery', () => {
  it('round trips progression and prevents collecting a completed reward again', () => {
    const sim = new Simulation(); act(sim, 'accept'); act(sim, 'deliver');
    const decoded = decodeSave(JSON.stringify(sim.state)); expect(decoded).toEqual(sim.state);
    const restored = new Simulation(decoded!); expect(restored.start('deliver').ok).toBe(false);
  });
  it.each([
    { version: 3 }, { balance: -1 }, { balance: 1.2 }, { balance: '1000000' },
    { position: { x: 14, z: -7 } }, { needs: { hunger: 200 } }, { parcel: 'paid' },
    { fan: 'true' }, { nextTransaction: 0 }, { shirt: 'url(javascript:evil)' },
    { ledger: [{ id: 1, amount: 3500, label: 'bad', minute: 451 }] },
  ])('rejects malformed data: %j', patch => {
    expect(decodeSave(JSON.stringify({ ...newGame(), ...patch }))).toBeNull();
  });
  it('rejects oversized, broken JSON and null saves', () => {
    expect(decodeSave('x'.repeat(100001))).toBeNull(); expect(decodeSave('{')).toBeNull(); expect(decodeSave('null')).toBeNull();
  });
  it('recovers the last valid backup without deleting the broken current save', () => {
    const store = storage(); const state = newGame(); saveGame(store, state); state.balance = 12000; saveGame(store, state);
    store.setItem(SAVE_KEY, '{bad'); const result = loadSave(store);
    expect(result.kind).toBe('loaded'); if (result.kind === 'loaded') { expect(result.recovered).toBe(true); expect(result.state.balance).toBe(12500); }
    expect(store.getItem(SAVE_KEY)).toBe('{bad');
  });
  it('does not overwrite a save with invalid state', () => {
    const store = storage(); saveGame(store, newGame()); const before = store.getItem(SAVE_KEY);
    const state = newGame(); state.balance = -5; expect(saveGame(store, state)).toBe(false); expect(store.getItem(SAVE_KEY)).toBe(before);
  });
  it('reports storage failures instead of claiming progress is saved', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    expect(loadSave(broken).kind).toBe('invalid'); expect(saveGame(broken, newGame())).toBe(false);
  });
});
