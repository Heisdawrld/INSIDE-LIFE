/** Shared world data. Coordinates are metres; renderers do not own walkability. */
export interface Point { x: number; z: number }
export interface Rect { x: number; z: number; w: number; d: number }
export type PlaceId = 'bed' | 'water' | 'shop' | 'mechanic' | 'neighbour' | 'room';
export interface Place { id: PlaceId; name: string; role: string; point: Point; color: string }

export const PLACES: readonly Place[] = [
  { id: 'bed', name: 'Your room', role: 'Rest & recover', point: { x: -11, z: -6 }, color: '#e3b36b' },
  { id: 'water', name: 'Water point', role: 'Freshen up', point: { x: -3, z: -1 }, color: '#7ab9c5' },
  { id: 'shop', name: 'Mama T’s shop', role: 'Food & first opportunity', point: { x: 10.5, z: -4 }, color: '#e9bb64' },
  { id: 'mechanic', name: 'Tunde’s workshop', role: 'Deliver the parcel', point: { x: 10.5, z: 8 }, color: '#cf8160' },
  { id: 'neighbour', name: 'Aunty Bisi', role: 'Meet your neighbour', point: { x: -6, z: 5 }, color: '#a7b98d' },
  { id: 'room', name: 'Make it yours', role: 'A little comfort goes a long way', point: { x: -8, z: -4.5 }, color: '#e3b36b' },
];

export const BOUNDS = { minX: -17, maxX: 17, minZ: -13, maxZ: 15 };
export const OBSTACLES: readonly Rect[] = [
  { x: -10.5, z: -11, w: 11, d: .4 },
  { x: -16, z: -7, w: .4, d: 8 },
  { x: -5, z: -8, w: .4, d: 6 },
  { x: -13.5, z: -8.5, w: 2.2, d: 3.4 },
  { x: -7, z: -9.5, w: 2, d: 1.3 },
  { x: -3, z: -3, w: 2, d: 2 },
  { x: 14, z: -7, w: 6, d: 4 },
  { x: 14, z: 10.5, w: 6, d: 4 },
  { x: -13, z: 8, w: 4, d: 3 },
  { x: -7, z: 6.8, w: 3, d: 1 },
];

export function isWalkable(p: Point): boolean {
  const radius = .3;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return false;
  if (p.x < BOUNDS.minX || p.x > BOUNDS.maxX || p.z < BOUNDS.minZ || p.z > BOUNDS.maxZ) return false;
  return !OBSTACLES.some(r => Math.abs(p.x - r.x) < r.w / 2 + radius && Math.abs(p.z - r.z) < r.d / 2 + radius);
}

export function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.z - b.z); }
export function place(id: PlaceId): Place { return PLACES.find(p => p.id === id)!; }

/** Bounded four-neighbour BFS. No corner cutting through furniture or walls. */
export function findPath(from: Point, to: Point): Point[] {
  if (!isWalkable(to)) return [];
  const size = .5;
  const key = (p: Point) => `${Math.round(p.x / size)},${Math.round(p.z / size)}`;
  const start = { x: Math.round(from.x / size) * size, z: Math.round(from.z / size) * size };
  const end = { x: Math.round(to.x / size) * size, z: Math.round(to.z / size) * size };
  if (!isWalkable(start) || !isWalkable(end)) return [];
  const queue = [start];
  const parent = new Map<string, Point | null>([[key(start), null]]);
  for (let i = 0; i < queue.length && i < 5000; i++) {
    const p = queue[i]!;
    if (key(p) === key(end)) {
      const path = [to];
      let cursor: Point | null = p;
      while (cursor && key(cursor) !== key(start)) {
        path.unshift(cursor);
        cursor = parent.get(key(cursor)) ?? null;
      }
      return path;
    }
    for (const offset of [{ x: size, z: 0 }, { x: -size, z: 0 }, { x: 0, z: size }, { x: 0, z: -size }]) {
      const next = { x: p.x + offset.x, z: p.z + offset.z };
      if (isWalkable(next) && !parent.has(key(next))) { parent.set(key(next), p); queue.push(next); }
    }
  }
  return [];
}
