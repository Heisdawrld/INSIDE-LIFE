import { Quaternion } from 'three';
import type { Bone } from 'three';

/** Blend rendered poses only; never changes simulation time or movement. */
export function createPoseTransition(bones: Bone[], duration = .28) {
  const displayed = bones.map(b => b.quaternion.clone());
  const origin = bones.map(b => b.quaternion.clone());
  const target = new Quaternion();
  let previousTime = -Infinity;
  let previousMode = '';
  let started = -Infinity;

  // Call after the animation sampler has written this frame's target pose.
  return (time: number, mode: string, reducedMotion: boolean) => {
    const reset = !previousMode || time < previousTime || reducedMotion;
    if (reset) started = -Infinity;
    else if (mode !== previousMode) {
      started = time;
      origin.forEach((q, i) => q.copy(displayed[i]!));
    }
    const progress = Math.min(1, Math.max(0, (time - started) / duration));
    const blend = progress * progress * (3 - 2 * progress);
    bones.forEach((bone, i) => {
      if (blend < 1) {
        target.copy(bone.quaternion);
        bone.quaternion.slerpQuaternions(origin[i]!, target, blend);
      }
      displayed[i]!.copy(bone.quaternion);
    });
    previousTime = time;
    previousMode = mode;
  };
}
