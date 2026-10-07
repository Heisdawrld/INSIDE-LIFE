import * as T from 'three';
import { BODY_PRESETS, HAIR_COLORS, OUTFIT_COLORS, SKIN_TONES, validAppearance } from '../game/appearance';
import type { Appearance, HairStyle } from '../game/appearance';
import { createCharacter } from '../render/character';
import type { Character } from '../render/character';

export interface CharacterChoice { appearance: Appearance; shirt: string }
export function openCreator(initial: CharacterChoice, onSave: (choice: CharacterChoice) => void, onClose: () => void): void {
  let draft = structuredClone(initial);
  const dialog = document.createElement('dialog'); dialog.className = 'character-creator';
  const rangeFields = [
    ['build', 'Body fullness', 'Lean', 'Fuller'], ['waist', 'Waist', 'Defined', 'Softer'],
    ['hips', 'Hips & thighs', 'Narrower', 'Fuller'], ['chest', 'Chest', 'Smaller', 'Fuller'],
    ['height', 'Height', 'Shorter', 'Taller'], ['face', 'Face shape', 'Narrower', 'Broader'],
  ] as const;
  dialog.innerHTML = `<div class="creator-preview"><div class="creator-brand">INSIDE LIFE<span>CHARACTER STUDIO</span></div><div class="creator-canvas"></div><div class="creator-caption"><span class="eyebrow">YOUR LIFE. YOUR LOOK.</span><h2>Make yourself<br><em>at home.</em></h2></div><div class="creator-view-tools"><button data-view="body" aria-pressed="true">Full body</button><button data-view="face" aria-pressed="false">Face detail</button><button data-turn="-1" aria-label="Rotate character left">↶</button><button data-turn="1" aria-label="Rotate character right">↷</button></div><div class="creator-drag">DRAG TO ROTATE · ALL CHARACTERS ARE ADULTS</div></div><section class="creator-controls"><div class="section-head"><span>CREATE YOUR CHARACTER</span><button class="creator-close" aria-label="Close character studio">✕</button></div><h2>A face. A shape.<br>A whole person.</h2><p class="creator-intro">Start with a shape, then make it yours. Appearance never changes your skills or opportunities.</p><div class="creator-scroll"><fieldset><legend>BODY FRAME</legend><div class="segmented"><button data-frame="feminine">Feminine</button><button data-frame="masculine">Masculine</button></div></fieldset><fieldset><legend>START WITH A SHAPE</legend><div class="preset-grid">${Object.keys(BODY_PRESETS).map(p => `<button data-preset="${p}">${p === 'full' ? 'Fuller' : p[0]!.toUpperCase() + p.slice(1)}</button>`).join('')}</div></fieldset><fieldset class="body-sliders"><legend>YOUR PROPORTIONS</legend>${rangeFields.map(([key, label, left, right]) => `<label class="body-control"><span>${label}<output data-value="${key}"></output></span><input aria-label="${label}" data-range="${key}" type="range" min="0" max="100" step="1"/><small><span>${left}</span><span>${right}</span></small></label>`).join('')}</fieldset><fieldset><legend>SKIN TONE</legend><div class="creator-swatches">${SKIN_TONES.map((c, i) => `<button data-skin="${c}" aria-label="Skin tone ${i + 1}" style="--swatch:${c}"></button>`).join('')}</div></fieldset><fieldset><legend>HAIR</legend><div class="preset-grid">${['crop', 'afro', 'locs', 'bun'].map(h => `<button data-hair="${h}">${{ crop: 'Low cut', afro: 'Afro', locs: 'Locs', bun: 'Sleek bun' }[h]}</button>`).join('')}</div><div class="creator-swatches small-swatches">${HAIR_COLORS.map((c, i) => `<button data-hair-color="${c}" aria-label="Hair colour ${i + 1}" style="--swatch:${c}"></button>`).join('')}</div></fieldset><fieldset><legend>EVERYDAY OUTFIT</legend><div class="creator-swatches">${OUTFIT_COLORS.map((c, i) => `<button data-outfit="${c}" aria-label="Outfit colour ${i + 1}" style="--swatch:${c}"></button>`).join('')}</div><p class="creator-footnote">Fitted knit top · tailored trousers · everyday trainers.<br>More clothing and accessories will follow.</p></fieldset></div><div class="creator-footer"><button class="primary creator-save">This is me <span>✓</span></button><p>You can return and edit your look at any time.</p></div></section>`;
  document.body.append(dialog); dialog.showModal();
  const host = dialog.querySelector<HTMLElement>('.creator-canvas')!;
  let renderer: T.WebGLRenderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); }
  catch {
    host.innerHTML = '<p class="creator-error">The preview could not start. Close the studio and try again.</p>';
    dialog.querySelector('.creator-close')!.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { dialog.remove(); onClose(); }, { once: true }); return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', 'Rotatable 3D preview of your adult character');
  host.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32, 1, .1, 30);
  scene.add(new T.HemisphereLight('#f8ebd6', '#64776d', 2));
  const key = new T.DirectionalLight('#fff0d7', 3.4); key.position.set(-3, 4, 5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -2; key.shadow.camera.right = 2; key.shadow.camera.top = 3; key.shadow.camera.bottom = -1; key.shadow.normalBias = .018; scene.add(key);
  const fill = new T.DirectionalLight('#c9e0e5', 1.8); fill.position.set(3, 2, -3); scene.add(fill);
  const groundGeo = new T.CircleGeometry(1.3, 64); const groundMat = new T.MeshStandardMaterial({ color: '#b2b7a4', roughness: 1 });
  const floor = new T.Mesh(groundGeo, groundMat); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = -.03; scene.add(floor);
  let character: Character = createCharacter(draft.appearance, draft.shirt, true); scene.add(character.group);
  let angle = -.14; let faceView = false; let pending = false; let frame = 0;
  let dragging = false; let lastX = 0; let animationTime = 0; let previous = performance.now();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const abort = new AbortController();

  function sync() {
    dialog.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.frame === draft.appearance.frame)));
    dialog.querySelectorAll<HTMLInputElement>('[data-range]').forEach(input => {
      const k = input.dataset.range as keyof Pick<Appearance, 'build' | 'waist' | 'hips' | 'chest' | 'height' | 'face'>;
      input.value = String(Math.round(draft.appearance[k] * 100)); dialog.querySelector(`[data-value="${k}"]`)!.textContent = input.value;
    });
    for (const [data, value] of [['skin', draft.appearance.skin], ['hair', draft.appearance.hair], ['hair-color', draft.appearance.hairColor], ['outfit', draft.shirt]]) {
      dialog.querySelectorAll<HTMLButtonElement>(`[data-${data}]`).forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute(`data-${data}`) === value)));
    }
    pending = true;
  }
  function resize() { const w = host.clientWidth; const h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); }
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  function updateCamera() {
    const factor = .96 + draft.appearance.height * .16;
    if (faceView) { camera.position.set(0, 1.68 * factor, .94); camera.lookAt(0, 1.68 * factor, 0); }
    else { camera.position.set(0, 1.1, camera.aspect < .75 || host.clientHeight < 400 ? 5.4 : 4.5); camera.lookAt(0, 1.02, 0); }
  }
  dialog.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach(b => b.addEventListener('click', () => { draft.appearance.frame = b.dataset.frame as Appearance['frame']; sync(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(b => b.addEventListener('click', () => {
    Object.assign(draft.appearance, BODY_PRESETS[b.dataset.preset!]);
    if (draft.appearance.frame === 'feminine' && draft.appearance.hair === 'crop') draft.appearance.hair = 'bun';
    sync();
  }));
  dialog.querySelectorAll<HTMLInputElement>('[data-range]').forEach(input => input.addEventListener('input', () => {
    const k = input.dataset.range as keyof Pick<Appearance, 'build' | 'waist' | 'hips' | 'chest' | 'height' | 'face'>;
    draft.appearance[k] = Number(input.value) / 100; dialog.querySelector(`[data-value="${k}"]`)!.textContent = input.value; pending = true;
  }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-skin]').forEach(b => b.addEventListener('click', () => { draft.appearance.skin = b.dataset.skin!; sync(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-hair]').forEach(b => b.addEventListener('click', () => { draft.appearance.hair = b.dataset.hair as HairStyle; sync(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-hair-color]').forEach(b => b.addEventListener('click', () => { draft.appearance.hairColor = b.dataset.hairColor!; sync(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-outfit]').forEach(b => b.addEventListener('click', () => { draft.shirt = b.dataset.outfit!; sync(); }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.addEventListener('click', () => {
    faceView = b.dataset.view === 'face'; dialog.querySelectorAll('[data-view]').forEach(t => t.setAttribute('aria-pressed', String(t === b))); updateCamera();
  }));
  dialog.querySelectorAll<HTMLButtonElement>('[data-turn]').forEach(b => b.addEventListener('click', () => { angle += Number(b.dataset.turn) * Math.PI / 4; }));
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); }, { signal: abort.signal });
  renderer.domElement.addEventListener('pointermove', e => { if (!dragging) return; angle += (e.clientX - lastX) * .012; lastX = e.clientX; }, { signal: abort.signal });
  renderer.domElement.addEventListener('pointerup', () => { dragging = false; }, { signal: abort.signal });
  renderer.domElement.addEventListener('pointercancel', () => { dragging = false; }, { signal: abort.signal });
  dialog.querySelector('.creator-close')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('.creator-save')!.addEventListener('click', () => {
    if (!validAppearance(draft.appearance) || !OUTFIT_COLORS.includes(draft.shirt as typeof OUTFIT_COLORS[number])) return;
    onSave(structuredClone(draft)); dialog.close();
  });
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(frame); abort.abort(); observer.disconnect(); character.dispose(); renderer.dispose(); groundGeo.dispose(); groundMat.dispose(); dialog.remove(); onClose();
  }, { once: true });
  sync(); updateCamera();
  function render(now: number) {
    animationTime += Math.min((now - previous) / 1000, .05); previous = now;
    if (pending) { scene.remove(character.group); character.dispose(); character = createCharacter(draft.appearance, draft.shirt, true); scene.add(character.group); pending = false; updateCamera(); }
    character.group.rotation.y = angle; character.animate(animationTime, false, reduced);
    renderer.render(scene, camera); frame = requestAnimationFrame(render);
  }
  frame = requestAnimationFrame(render);
}
