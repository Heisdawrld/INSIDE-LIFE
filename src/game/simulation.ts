import { distance, isWalkable, place } from './world';
import type { PlaceId, Point } from './world';
import { DEFAULT_APPEARANCE } from './appearance';
import type { Appearance } from './appearance';

export const FIXED_STEP = 1 / 20;
export const FAN_PRICE = 4500;
export type Need = 'hunger' | 'energy' | 'hygiene' | 'social';
export interface Transaction { id: number; amount: number; label: string; minute: number }
export interface GameState {
  version: 2;
  name: string;
  shirt: string;
  appearance: Appearance;
  minute: number;
  position: Point;
  balance: number;
  needs: Record<Need, number>;
  parcel: 'available' | 'carrying' | 'delivered';
  metBisi: boolean;
  fan: boolean;
  meals: number;
  ledger: Transaction[];
  nextTransaction: number;
}
export type ActionId = 'eat' | 'rest' | 'wash' | 'chat' | 'accept' | 'deliver' | 'fan';
export interface ActionSpec { id: ActionId; place: PlaceId; title: string; detail: string; seconds: number; cost: number }
export const ACTIONS: Record<ActionId, ActionSpec> = {
  eat: { id: 'eat', place: 'shop', title: 'Buy bread & akara', detail: 'A proper breakfast. +35 hunger', seconds: 4, cost: 700 },
  rest: { id: 'rest', place: 'bed', title: 'Take a short rest', detail: 'Catch your breath. +35 energy', seconds: 8, cost: 0 },
  wash: { id: 'wash', place: 'water', title: 'Wash up', detail: 'Bucket, water, fresh start. +45 hygiene', seconds: 5, cost: 0 },
  chat: { id: 'chat', place: 'neighbour', title: 'Introduce yourself', detail: 'A friendly face in a new place. +25 social', seconds: 5, cost: 0 },
  accept: { id: 'accept', place: 'shop', title: 'Take the delivery job', detail: 'Carry a sealed spare-parts parcel to Tunde. Earn ₦3,500 on delivery.', seconds: 2, cost: 0 },
  deliver: { id: 'deliver', place: 'mechanic', title: 'Hand over the parcel', detail: 'Finish the job. Receive ₦3,500 virtual funds.', seconds: 4, cost: 0 },
  fan: { id: 'fan', place: 'room', title: 'Get a standing fan', detail: 'Your first home upgrade. Rest restores 15 extra energy.', seconds: 3, cost: FAN_PRICE },
};
export interface ActiveAction { id: ActionId; elapsed: number }
export interface Outcome { ok: boolean; message: string }

export function newGame(name = 'Dara', shirt = '#db9b46'): GameState {
  return { version: 2, name: name.trim().slice(0, 24) || 'Dara', shirt, appearance: { ...DEFAULT_APPEARANCE }, minute: 450,
    position: { x: -9, z: -2 }, balance: 12500, needs: { hunger: 62, energy: 76, hygiene: 65, social: 45 },
    parcel: 'available', metBisi: false, fan: false, meals: 0, ledger: [], nextTransaction: 1 };
}

export class Simulation {
  state: GameState;
  active: ActiveAction | null = null;
  path: Point[] = [];
  notice = '';
  constructor(state = newGame()) { this.state = structuredClone(state); }

  canAct(id: ActionId): string | null {
    const spec = ACTIONS[id];
    if (distance(this.state.position, place(spec.place).point) > 1.7) return 'Walk a little closer first.';
    if (this.active) return 'Finish your current activity first.';
    if (this.state.balance < spec.cost) return 'You don’t have enough virtual funds yet.';
    if (id === 'accept' && this.state.parcel !== 'available') return 'You’ve already taken this job.';
    if (id === 'deliver' && this.state.parcel !== 'carrying') return 'Pick up the parcel from Mama T first.';
    if (id === 'fan' && this.state.fan) return 'Your fan is already installed.';
    return null;
  }

  start(id: ActionId): Outcome {
    const reason = this.canAct(id);
    if (reason) return { ok: false, message: reason };
    this.path = [];
    this.active = { id, elapsed: 0 };
    return { ok: true, message: ACTIONS[id].title };
  }

  cancel(): void { this.active = null; this.path = []; }
  walk(path: Point[]): void { this.active = null; this.path = path.map(p => ({ ...p })); }

  tick(dt: number): void {
    // Reject invalid/unbounded catch-up; hidden tabs are paused by the host.
    if (!Number.isFinite(dt) || dt <= 0 || dt > .25) return;
    const s = this.state;
    s.minute += dt * .8;
    const moving = this.path.length > 0;
    for (const [need, rate] of Object.entries({ hunger: .023, energy: moving ? .017 : .009, hygiene: .009, social: .005 })) {
      const n = need as Need;
      s.needs[n] = Math.max(0, s.needs[n] - dt * rate);
    }
    if (this.active) {
      this.active.elapsed += dt;
      if (this.active.elapsed + 1e-9 >= ACTIONS[this.active.id].seconds) this.complete(this.active.id);
    } else if (this.path[0]) {
      const goal = this.path[0];
      const length = distance(s.position, goal);
      const step = Math.min(length, dt * (s.needs.energy < 15 ? 1.0 : 1.65));
      const next = length < .001 ? goal : { x: s.position.x + (goal.x - s.position.x) / length * step, z: s.position.z + (goal.z - s.position.z) / length * step };
      if (isWalkable(next)) s.position = { ...next }; else this.path = [];
      if (length <= step + .001) this.path.shift();
    }
  }

  private transact(amount: number, label: string): void {
    this.state.balance += amount;
    this.state.ledger.push({ id: this.state.nextTransaction++, amount, label, minute: this.state.minute });
    this.state.ledger = this.state.ledger.slice(-100);
  }

  private complete(id: ActionId): void {
    this.active = null;
    // Revalidate at commit time. A future server must own this same boundary.
    const error = this.canAct(id);
    if (error) { this.notice = error; return; }
    const s = this.state;
    const add = (need: Need, amount: number) => { s.needs[need] = Math.min(100, s.needs[need] + amount); };
    if (ACTIONS[id].cost) this.transact(-ACTIONS[id].cost, ACTIONS[id].title);
    switch (id) {
      case 'eat': add('hunger', 35); s.meals++; this.notice = 'Hot akara, soft bread. That’s a better morning.'; break;
      case 'rest': add('energy', s.fan ? 50 : 35); this.notice = s.fan ? 'A little breeze makes all the difference. Energy restored.' : 'You feel rested. A fan would make this room more comfortable.'; break;
      case 'wash': add('hygiene', 45); this.notice = 'Fresh again. Ready for the street.'; break;
      case 'chat': add('social', 25); s.metBisi = true; this.notice = 'Bisi: “Welcome o! Mama T across the road needs a reliable pair of hands.”'; break;
      case 'accept': s.parcel = 'carrying'; this.notice = 'Parcel collected. Take it to Tunde’s workshop, down the other side of the street.'; break;
      case 'deliver': s.parcel = 'delivered'; this.transact(3500, 'Spare-parts delivery'); this.notice = 'Tunde: “Correct! Thank you.” ₦3,500 earned. Your first job is done.'; break;
      case 'fan': s.fan = true; this.notice = 'Your standing fan is in place. Your room feels more like home.'; break;
    }
  }
}

export function objectives(s: GameState) {
  return [
    { label: 'Meet your neighbour', done: s.metBisi, place: 'neighbour' as PlaceId },
    { label: 'Get breakfast at Mama T’s', done: s.meals > 0, place: 'shop' as PlaceId },
    { label: s.parcel === 'carrying' ? 'Deliver the parcel to Tunde' : 'Earn your first ₦3,500', done: s.parcel === 'delivered', place: (s.parcel === 'carrying' ? 'mechanic' : 'shop') as PlaceId },
    { label: 'Make your room yours', done: s.fan, place: 'room' as PlaceId },
  ];
}
