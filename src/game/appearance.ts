/** Adult appearance only. These values affect presentation, never earning ability. */
export const SKIN_TONES = ['#c58b62', '#ae7049', '#925a37', '#77452d', '#5b3526', '#41291f'] as const;
export const HAIR_COLORS = ['#201c1a', '#38271e', '#603b25', '#8a5732'] as const;
export const OUTFIT_COLORS = ['#db9b46', '#488d80', '#b96556', '#678eaf'] as const;
export type HairStyle = 'crop' | 'afro' | 'locs' | 'bun';
export interface Appearance {
  outfit?: 'fitted' | 'relaxed' | 'tailored';
  frame: 'feminine' | 'masculine';
  build: number;
  waist: number;
  hips: number;
  chest: number;
  height: number;
  face: number;
  skin: string;
  hair: HairStyle;
  hairColor: string;
}
export const DEFAULT_APPEARANCE: Appearance = { frame: 'masculine', build: .4, waist: .45, hips: .35, chest: .45, height: .5, face: .5, skin: '#77452d', hair: 'crop', hairColor: '#201c1a' };
export const BODY_PRESETS: Record<string, Pick<Appearance, 'frame' | 'build' | 'waist' | 'hips' | 'chest'>> = {
  balanced: { frame: 'feminine', build: .38, waist: .4, hips: .5, chest: .4 },
  curvy: { frame: 'feminine', build: .57, waist: .38, hips: .85, chest: .66 },
  full: { frame: 'feminine', build: .82, waist: .76, hips: .88, chest: .72 },
  lean: { frame: 'masculine', build: .2, waist: .28, hips: .25, chest: .3 },
  athletic: { frame: 'masculine', build: .65, waist: .38, hips: .4, chest: .8 },
  broad: { frame: 'masculine', build: .85, waist: .72, hips: .62, chest: .75 },
};
export function validAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const a = value as Record<string, unknown>;
  return (a.outfit === undefined || ['fitted', 'relaxed', 'tailored'].includes(a.outfit as string))
    && ['feminine', 'masculine'].includes(a.frame as string)
    && ['build', 'waist', 'hips', 'chest', 'height', 'face'].every(k => typeof a[k] === 'number' && Number.isFinite(a[k]) && (a[k] as number) >= 0 && (a[k] as number) <= 1)
    && SKIN_TONES.includes(a.skin as typeof SKIN_TONES[number])
    && ['crop', 'afro', 'locs', 'bun'].includes(a.hair as string)
    && HAIR_COLORS.includes(a.hairColor as typeof HAIR_COLORS[number]);
}
