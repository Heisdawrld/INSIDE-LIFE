import type { GameState, Need, Transaction } from './simulation';
import { isWalkable } from './world';
import { DEFAULT_APPEARANCE, OUTFIT_COLORS, validAppearance } from './appearance';

export const SAVE_KEY = 'inside-life:save:v1';
const COLORS: readonly string[] = OUTFIT_COLORS;
export const SHIRT_COLORS = COLORS as readonly string[];
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export type LoadResult = { kind: 'empty' } | { kind: 'loaded'; state: GameState; recovered: boolean } | { kind: 'invalid'; message: string };
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function finite(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }

/** Never trust persisted data. Unknown save versions fail closed and remain on disk. */
export function decodeSave(raw: string): GameState | null {
  if (raw.length > 100_000) return null;
  try {
    const s: unknown = JSON.parse(raw);
    if (!record(s) || (s.version !== 1 && s.version !== 2) || typeof s.name !== 'string' || !s.name.trim() || s.name.length > 24 || /[\u0000-\u001f]/.test(s.name)) return null;
    const appearance = s.version === 1 ? { ...DEFAULT_APPEARANCE } : s.appearance;
    if (!validAppearance(appearance)) return null;
    if (typeof s.shirt !== 'string' || !COLORS.includes(s.shirt) || !finite(s.minute, 0, 1e8)) return null;
    if (!record(s.position) || !finite(s.position.x, -17, 17) || !finite(s.position.z, -13, 15) || !isWalkable({ x: s.position.x, z: s.position.z })) return null;
    if (!finite(s.balance, 0, 1e9) || !Number.isSafeInteger(s.balance) || !record(s.needs)) return null;
    if (!(['hunger', 'energy', 'hygiene', 'social'] as Need[]).every(n => finite((s.needs as Record<string, unknown>)[n], 0, 100))) return null;
    if (!['available', 'carrying', 'delivered'].includes(s.parcel as string) || typeof s.metBisi !== 'boolean' || typeof s.fan !== 'boolean') return null;
    if (!finite(s.meals, 0, 1e7) || !Number.isSafeInteger(s.meals) || !Number.isSafeInteger(s.nextTransaction) || !finite(s.nextTransaction, 1, 1e8)) return null;
    if (!Array.isArray(s.ledger) || s.ledger.length > 100) return null;
    let previous = 0;
    for (const t of s.ledger as unknown[]) {
      if (!record(t) || !Number.isSafeInteger(t.id) || !finite(t.id, previous + 1, s.nextTransaction - 1) || !Number.isSafeInteger(t.amount) || !finite(t.amount, -1e9, 1e9) || typeof t.label !== 'string' || t.label.length > 100 || !finite(t.minute, 0, s.minute)) return null;
      previous = t.id;
    }
    return { version: 2, name: s.name, shirt: s.shirt, appearance: { ...appearance }, minute: s.minute,
      position: { x: s.position.x, z: s.position.z }, balance: s.balance,
      needs: { hunger: s.needs.hunger as number, energy: s.needs.energy as number, hygiene: s.needs.hygiene as number, social: s.needs.social as number },
      parcel: s.parcel as GameState['parcel'], metBisi: s.metBisi, fan: s.fan, meals: s.meals,
      ledger: (s.ledger as Transaction[]).map(t => ({ id: t.id, amount: t.amount, label: t.label, minute: t.minute })), nextTransaction: s.nextTransaction };
  } catch { return null; }
}

export function loadSave(storage: StoragePort): LoadResult {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { kind: 'empty' };
    const state = decodeSave(raw);
    if (state) return { kind: 'loaded', state, recovered: false };
    const backup = storage.getItem(`${SAVE_KEY}:backup`);
    const recovered = backup ? decodeSave(backup) : null;
    return recovered ? { kind: 'loaded', state: recovered, recovered: true } : { kind: 'invalid', message: 'This save could not be read. It has not been overwritten. Export it before starting a new life.' };
  } catch { return { kind: 'invalid', message: 'Browser storage is unavailable. You can play, but export your save before leaving.' }; }
}

export function saveGame(storage: StoragePort, state: GameState): boolean {
  try {
    const raw = JSON.stringify(state);
    if (!decodeSave(raw)) return false;
    const previous = storage.getItem(SAVE_KEY);
    if (previous && decodeSave(previous)) storage.setItem(`${SAVE_KEY}:backup`, previous);
    storage.setItem(SAVE_KEY, raw);
    return true;
  } catch { return false; }
}
