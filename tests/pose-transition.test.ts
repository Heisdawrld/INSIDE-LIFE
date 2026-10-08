import { describe, expect, it } from 'vitest';
import { Bone, Quaternion, Vector3 } from 'three';
import { createPoseTransition } from '../src/render/pose-transition';

const target = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 1);

describe('rendered pose transitions', () => {
  it('starts continuously and reaches the sampled target after the blend', () => {
    const bone = new Bone(); const apply = createPoseTransition([bone]);
    apply(0, 'standing', false);
    bone.quaternion.copy(target); apply(.1, 'walking', false);
    expect(bone.quaternion.angleTo(new Quaternion())).toBeCloseTo(0);
    bone.quaternion.copy(target); apply(.24, 'walking', false);
    expect(bone.quaternion.angleTo(target)).toBeCloseTo(.5);
    bone.quaternion.copy(target); apply(.4, 'walking', false);
    expect(bone.quaternion.angleTo(target)).toBeCloseTo(0);
  });

  it('can reverse direction mid-transition without snapping', () => {
    const bone = new Bone(); const apply = createPoseTransition([bone]);
    apply(0, 'standing', false);
    bone.quaternion.copy(target); apply(.1, 'walking', false);
    bone.quaternion.copy(target); apply(.24, 'walking', false);
    const halfway = bone.quaternion.clone();
    bone.quaternion.identity(); apply(.25, 'standing', false);
    expect(bone.quaternion.angleTo(halfway)).toBeCloseTo(0);
    bone.quaternion.identity(); apply(.6, 'standing', false);
    expect(bone.quaternion.angleTo(new Quaternion())).toBeCloseTo(0);
  });

  it('respects reduced motion and resets when the animation clock rewinds', () => {
    const bone = new Bone(); const apply = createPoseTransition([bone]);
    apply(5, 'standing', false);
    bone.quaternion.copy(target); apply(6, 'walking', true);
    expect(bone.quaternion.angleTo(target)).toBeCloseTo(0);
    bone.quaternion.identity(); apply(0, 'standing', false);
    expect(bone.quaternion.angleTo(new Quaternion())).toBeCloseTo(0);
  });
});
