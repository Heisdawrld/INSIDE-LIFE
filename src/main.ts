import '@fontsource-variable/dm-sans';
import '@fontsource-variable/manrope';
import './style.css';
import { ACTIONS, FIXED_STEP, Simulation, newGame, objectives } from './game/simulation';
import type { ActionId, GameState, Need } from './game/simulation';
import { PLACES, distance, findPath, isWalkable, place } from './game/world';
import type { PlaceId } from './game/world';
import { SAVE_KEY, decodeSave, loadSave, saveGame } from './game/save';
import { createScene } from './render/scene';
import type { SceneView } from './render/scene';
import { openCreator } from './ui/creator';
import { createEntry } from './ui/entry';

const money = (n: number) => `₦${new Intl.NumberFormat('en-NG').format(n)}`;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    book: '<path d="M4 3h14a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2V3Zm0 13h16M8 7h8M8 11h5"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 4 12 8-12 8Z"/>',
    food: '<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 21V3c-5 2-5 10 0 10"/>',
    energy: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
    water: '<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',
    social: '<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z"/><path d="M7 11h10"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.pin}</svg>`;
};

const app = document.querySelector<HTMLDivElement>('#app')!;
const lifecycle = new AbortController();
app.innerHTML = `
  <main class="game-shell">
    <div id="world" aria-label="Game world"></div><div class="world-vignette"></div>
    <div id="markers"></div>
    <header class="topbar">
      <a class="brand" href="#" aria-label="INSIDE LIFE home"><span class="brand-mark">IL<span>✳</span></span><span>INSIDE LIFE<small>EVERYBODY STARTS SOMEWHERE</small></span></a>
      <div class="clock"><span class="sun-icon">${icon('sun')}</span><span><strong id="clock">07:30</strong><small id="day">MONDAY · DAY 1</small></span><span class="weather">26°<small>WARM MORNING</small></span></div>
      <div class="account"><div class="wallet"><small>YOUR WALLET · VIRTUAL</small><strong id="balance">₦12,500</strong></div><button class="icon-button" id="main-menu" aria-label="Return to main menu">${icon('home')}</button><button class="icon-button" id="pause" aria-label="Pause game">${icon('pause')}</button><button class="icon-button" id="settings" aria-label="Open settings">${icon('settings')}</button></div>
    </header>
    <aside class="chapter"><div class="eyebrow"><span class="live-dot"></span> ORITA STREET, LAGOS</div><p class="chapter-number">CHAPTER 01 / MOVING IN</p><h1>A place<br>to call <em>home.</em></h1><p class="chapter-copy">New neighbours. Small beginnings.<br>A whole life ahead of you.</p><div class="chapter-line"></div><div class="location-note">${icon('pin', 16)} A fictional neighbourhood. A familiar feeling.</div></aside>
    <aside class="journal-card" id="journal-card"><div class="section-head"><span>TODAY’S SMALL WINS</span><span id="progress-count">0 / 4</span></div><div id="objectives"></div><p class="journal-note">One step at a time. You’ll find your way.</p></aside>
    <div class="camera-tools"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button></div>
    <div id="activity" class="activity hidden" aria-live="polite"></div>
    <div id="toast" class="toast hidden" role="status"></div>
    <section id="panel" class="side-panel hidden" aria-label="Activity details"></section>
    <footer class="bottom-ui">
      <section class="needs-card" aria-label="Your character’s needs"><div class="portrait"><span>◉</span></div><div class="identity"><strong id="player-name">Dara</strong><span id="mood">Finding your feet</span></div><div class="needs" id="needs"></div></section>
      <nav class="nav-bar" aria-label="Game navigation"><button data-nav="places" class="active">${icon('pin')}<span>Neighbourhood</span></button><button data-nav="home">${icon('home')}<span>My room</span></button><button data-nav="journal">${icon('book')}<span>My story</span></button><button data-nav="wallet">${icon('bag')}<span>Wallet</span></button></nav>
      <div class="controls-hint"><span>CLICK TO WALK</span><i>·</i><span>WASD / ARROWS</span><i>·</i><span id="save-status">Saved on this device</span></div>
    </footer>
    <div id="curtain"></div>
    <dialog id="settings-dialog"><div class="section-head"><span>MAKE YOURSELF COMFORTABLE</span><button id="close-settings" aria-label="Close settings">✕</button></div><h2>Your experience</h2><label class="setting"><span>Battery saver<small>Lower resolution, no dynamic shadows</small></span><input type="checkbox" id="low-quality"/></label><label class="setting"><span>Reduce motion<small>Stop ambient animations</small></span><input type="checkbox" id="reduce-motion"/></label><div class="save-tools"><button id="export" class="secondary">Export save</button><label class="secondary import-label">Import save<input type="file" id="import" accept=".json,application/json"/></label></div><p id="settings-note">Local saves belong to this browser. Export a copy before changing devices.</p><p class="fine-print">Foundation build 0.1 · Multiplayer, driving, police and investment systems are not yet implemented.</p></dialog>
  </main>`;

const $ = <E extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<E>(selector)!;
const world = $('#world');
let view: SceneView;
try { view = createScene(world); }
catch {
  $('#curtain').innerHTML = '<section class="welcome"><h2>Your browser couldn’t start the 3D world.</h2><p>INSIDE LIFE needs WebGL 2. Try a current browser with hardware acceleration enabled. No saved progress has been changed.</p></section>';
  throw new Error('WebGL initialization failed');
}
let storage: Storage | null;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = storage ? loadSave(storage) : { kind: 'invalid' as const, message: 'Storage is unavailable. Export your progress before leaving.' };
const sim = new Simulation(loaded.kind === 'loaded' ? loaded.state : newGame());
let started = false; let paused = false; let dialogPaused = false; let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let hasSession = false;
let entry: ReturnType<typeof createEntry>;
let selected: PlaceId | null = null;
let panelMode: 'place' | 'places' | 'wallet' | 'journal' | null = null;
let panelSignature = '';
let saveAllowed = loaded.kind !== 'invalid';
let toastUntil = 0;
let dirty = false;
let elapsed = 0;
let lastRender = 0;
let batterySaver = window.innerWidth <= 760;
view.quality(batterySaver);
($('#low-quality') as HTMLInputElement).checked = batterySaver;
const editCharacter = document.createElement('button');
editCharacter.className = 'portrait edit-character';
editCharacter.setAttribute('aria-label', 'Edit your character');
editCharacter.innerHTML = '<span>✎</span>';
$('.portrait').replaceWith(editCharacter);
function editLook() {
  if (!started) return;
  dialogPaused = true; keys.clear();
  openCreator({ appearance: sim.state.appearance, shirt: sim.state.shirt }, choice => {
    sim.state.appearance = structuredClone(choice.appearance); sim.state.shirt = choice.shirt;
    dirty = true; persist(); toast('Your look is updated. Your life and progress are unchanged.');
  }, () => { dialogPaused = false; });
}
editCharacter.addEventListener('click', editLook);
const keys = new Set<string>();
const markers = new Map<PlaceId, HTMLButtonElement>();
for (const p of PLACES.filter(p => ['shop', 'neighbour', 'mechanic', 'bed'].includes(p.id))) {
  const button = document.createElement('button'); button.className = 'world-marker'; button.dataset.place = p.id; button.innerHTML = `<span class="marker-dot" style="background:${p.color}"></span><span>${p.name}</span><b>↗</b>`;
  button.setAttribute('aria-label', `Walk to ${p.name}`); $('#markers').append(button); markers.set(p.id, button);
  button.addEventListener('click', () => visit(p.id));
}
$('#needs').innerHTML = (['hunger', 'energy', 'hygiene', 'social'] as Need[]).map((n, i) => `<div class="need" title="${n}"><div>${icon(['food', 'energy', 'water', 'social'][i]!, 15)}<span>${n}</span><b id="value-${n}"></b></div><meter id="need-${n}" min="0" max="100" low="25" high="65" optimum="100" value="60" aria-label="${n}"></meter></div>`).join('');

$('#reduce-motion').toggleAttribute('checked', reducedMotion);

function toast(message: string) { $('#toast').textContent = message; $('#toast').classList.remove('hidden'); toastUntil = performance.now() + 6000; }
function persist() {
  if (!started || !saveAllowed) return;
  const ok = storage ? saveGame(storage, sim.state) : false;
  $('#save-status').textContent = ok ? 'Saved on this device' : 'Not saved · export a copy';
  if (ok) dirty = false;
}
function setGameAccess(active: boolean) {
  $('.game-shell').classList.toggle('in-game', active);
  for (const selector of ['.topbar', '.chapter', '.journal-card', '.camera-tools', '.bottom-ui', '#markers', '#world', '#panel']) {
    $(selector).inert = !active;
  }
}
function enter(state: GameState, fresh = false) {
  sim.state = structuredClone(state); sim.cancel(); started = true; hasSession = true; paused = false;
  saveAllowed = true; dirty = true; dialogPaused = false;
  entry.hide(); setGameAccess(true); closePanel(); syncPause(); persist(); updateHud();
  view.canvas.focus({ preventScroll: true });
  toast(fresh ? 'Welcome home. Your first small win: greet Aunty Bisi by the courtyard bench.' : `Welcome back, ${sim.state.name}. Your story continues.`);
}
function returnToMenu() {
  if (!started) return;
  persist(); sim.cancel(); keys.clear(); closePanel(); started = false; setGameAccess(false);
  $('#toast').classList.add('hidden'); entry.show();
}
$('#main-menu').addEventListener('click', returnToMenu);
$('.brand').addEventListener('click', e => { e.preventDefault(); returnToMenu(); });

function visit(id: PlaceId) {
  if (!started) return;
  selected = id; panelMode = 'place'; panelSignature = '';
  const target = place(id).point;
  if (distance(sim.state.position, target) > 1.3) {
    const path = findPath(sim.state.position, target);
    if (path.length) sim.walk(path); else toast('There’s something in the way. Try a nearby open spot.');
  }
  updatePanel();
}
function closePanel() { panelMode = null; selected = null; $('#panel').classList.add('hidden'); }
const descriptions: Record<PlaceId, string> = {
  bed: 'A simple bed, a small table, and a fresh start. Your first week’s rent is already covered.',
  room: 'It doesn’t have to be fancy to feel like yours. A standing fan makes resting here more effective.',
  water: 'The compound’s shared water tank. There’s water this morning—freshen up before you head out.',
  shop: '“Morning! You’re the new neighbour? Eat something first. I also have a small delivery if you’re interested.”',
  mechanic: '“Mama T has my spare parts. Bring the parcel over and I’ll pay you for your time.”',
  neighbour: 'Bisi knows this compound inside out. Start with a greeting. A good neighbour can make a new place feel like home.',
};

function updatePanel() {
  if (!panelMode) return;
  const panel = $('#panel'); panel.classList.remove('hidden');
  const s = sim.state;
  const near = selected ? distance(s.position, place(selected).point) <= 1.7 : false;
  const signature = JSON.stringify([panelMode, selected, near, s.balance, s.parcel, s.fan, s.metBisi, s.meals, sim.active?.id, s.ledger.length]);
  if (signature === panelSignature) return;
  panelSignature = signature;
  let content = '';
  if (panelMode === 'place' && selected) {
    const p = place(selected);
    const acts = Object.values(ACTIONS).filter(a => a.place === p.id && !(a.id === 'accept' && s.parcel !== 'available') && !(a.id === 'fan' && s.fan) && !(a.id === 'deliver' && s.parcel !== 'carrying'));
    content = `<div class="eyebrow">${near ? 'YOU’RE HERE' : 'ON YOUR WAY'} · ORITA STREET</div><h2>${p.name}</h2><p class="panel-description">${descriptions[p.id]}</p>${p.id === 'shop' && s.parcel === 'carrying' ? '<div class="parcel-note">You’re carrying Tunde’s parcel. His workshop is down the street.</div>' : ''}${p.id === 'mechanic' && s.parcel === 'delivered' ? '<div class="parcel-note">Delivery complete. You earned ₦3,500.<br>More work opportunities will arrive in a later chapter.</div>' : ''}${p.id === 'room' && s.fan ? '<div class="parcel-note">Your fan is installed. Rest at your bed to enjoy +15 extra energy.</div>' : ''}<div class="action-list">${acts.map(a => {
      const reason = sim.canAct(a.id);
      return `<button data-action="${a.id}" class="action-button" ${reason ? 'disabled' : ''}><span><strong>${a.title}</strong><small>${a.detail}</small></span><b>${a.cost ? money(a.cost) : a.id === 'deliver' ? '+₦3,500' : 'Free'}<small>${a.seconds}s</small></b></button>`;
    }).join('')}</div>${!near ? '<p class="walk-hint">Walking there… Activities unlock when you arrive.</p>' : ''}${near && !sim.active && acts.some(a => s.balance < a.cost) ? '<p class="walk-hint">Earn a little more to afford the greyed-out options.</p>' : ''}`;
  } else if (panelMode === 'places') {
    content = `<div class="eyebrow">YOUR NEIGHBOURHOOD</div><h2>Know your street.</h2><p class="panel-description">Tap a destination. Your character will find a walkable route.</p><div class="destination-list">${PLACES.map(p => `<button data-go="${p.id}">${icon(p.id === 'bed' || p.id === 'room' ? 'home' : 'pin')}<span><strong>${p.name}</strong><small>${p.role}</small></span><b>↗</b></button>`).join('')}</div>`;
  } else if (panelMode === 'journal') {
    const allDone = objectives(s).every(o => o.done);
    content = `<div class="eyebrow">CHAPTER 01 · MOVING IN</div><h2>${allDone ? 'You’re settling in.' : 'Small wins count.'}</h2><p class="panel-description">${allDone ? 'You met a neighbour, earned honestly, ate well and improved your room. This is the end of the first playable chapter. Keep exploring—your progress is saved.' : 'A new life doesn’t happen all at once. Get comfortable, meet a neighbour, and find your first opportunity.'}</p><div class="story-list">${objectives(s).map(o => `<button data-go="${o.place}" class="${o.done ? 'done' : ''}"><span>${o.done ? '✓' : '○'}</span>${o.label}<b>↗</b></button>`).join('')}</div><p class="fine-print">This chapter is single-player. Bisi, Mama T and Tunde are simulated neighbours. No real-player chat or trading is connected yet.</p>`;
  } else {
    content = `<div class="eyebrow">ALL FUNDS ARE VIRTUAL</div><h2>${money(s.balance)}</h2><p class="panel-description">Starting cash: ₦12,500. Your first week’s rent is prepaid. No top-ups, cash-out or real-money transactions.</p><div class="ledger">${s.ledger.length ? [...s.ledger].reverse().map(t => `<div><span>${escape(t.label)}</span><strong class="${t.amount > 0 ? 'credit' : ''}">${t.amount > 0 ? '+' : '−'}${money(Math.abs(t.amount))}</strong></div>`).join('') : '<p>Your first transaction will appear here.</p>'}</div>`;
  }
  panel.innerHTML = `<button class="panel-close" aria-label="Close activity panel">✕</button>${content}`;
  panel.querySelector('.panel-close')!.addEventListener('click', closePanel);
  panel.querySelectorAll<HTMLButtonElement>('[data-go]').forEach(b => b.addEventListener('click', () => visit(b.dataset.go as PlaceId)));
  panel.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.addEventListener('click', () => {
    const result = sim.start(b.dataset.action as ActionId); if (!result.ok) toast(result.message); dirty = true; updatePanel();
  }));
}

let objectiveSignature = '';
function updateHud() {
  const s = sim.state;
  $('#player-name').textContent = s.name;
  const hour = Math.floor(s.minute / 60) % 24; const minute = Math.floor(s.minute) % 60;
  $('#clock').textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  $('#day').textContent = `${['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'][Math.floor(s.minute / 1440) % 7]} · DAY ${Math.floor(s.minute / 1440) + 1}`;
  $('#balance').textContent = money(s.balance);
  for (const n of ['hunger', 'energy', 'hygiene', 'social'] as Need[]) {
    const value = Math.round(s.needs[n]); ($(`#need-${n}`) as HTMLMeterElement).value = value; $(`#value-${n}`).textContent = `${value}`;
  }
  const worst = Math.min(...Object.values(s.needs));
  $('#mood').textContent = worst < 20 ? 'Time to take care of yourself' : s.metBisi && s.fan ? 'Feeling at home' : 'Finding your feet';
  const goals = objectives(s); const goalSignature = JSON.stringify(goals);
  if (objectiveSignature !== goalSignature) {
    objectiveSignature = goalSignature;
    $('#progress-count').textContent = `${goals.filter(g => g.done).length} / 4`;
    $('#objectives').innerHTML = goals.map(g => `<button data-objective="${g.place}" class="objective ${g.done ? 'done' : ''}"><span>${g.done ? '✓' : ''}</span>${g.label}<b>↗</b></button>`).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-objective]').forEach(b => b.addEventListener('click', () => visit(b.dataset.objective as PlaceId)));
  }
  const activity = $('#activity');
  if (sim.active) {
    activity.classList.remove('hidden');
    const a = ACTIONS[sim.active.id];
    activity.innerHTML = `<div><strong>${a.title}</strong><button id="cancel-action" aria-label="Cancel current activity">✕</button></div><progress max="${a.seconds}" value="${sim.active.elapsed}"></progress><small>${Math.max(0, Math.ceil(a.seconds - sim.active.elapsed))} seconds remaining</small>`;
    $('#cancel-action').onclick = () => { sim.cancel(); toast('Activity cancelled. No money was spent.'); };
  } else activity.classList.add('hidden');
  updatePanel();
}

document.querySelectorAll<HTMLButtonElement>('[data-nav]').forEach(b => b.addEventListener('click', () => {
  if (!started) return;
  if (b.dataset.nav === 'home') visit('bed');
  else { panelMode = b.dataset.nav as typeof panelMode; selected = null; panelSignature = ''; updatePanel(); }
  document.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n === b));
}));
function syncPause() { $('#pause').innerHTML = icon(paused ? 'play' : 'pause'); $('#pause').setAttribute('aria-label', paused ? 'Resume game' : 'Pause game'); $('.game-shell').classList.toggle('paused', paused); }
$('#pause').onclick = () => { paused = !paused; syncPause(); toast(paused ? 'Life is paused. Take your time.' : 'Back to the neighbourhood.'); };
$('#zoom-in').onclick = () => view.zoom(.1); $('#zoom-out').onclick = () => view.zoom(-.1);
const settings = $('#settings-dialog') as HTMLDialogElement;
const openSettings = () => { dialogPaused = true; keys.clear(); settings.showModal(); };
$('#settings').onclick = openSettings;

$('#close-settings').onclick = () => settings.close();
settings.addEventListener('close', () => { dialogPaused = false; });
$('#low-quality').addEventListener('change', e => { batterySaver = (e.target as HTMLInputElement).checked; view.quality(batterySaver); });
$('#reduce-motion').addEventListener('change', e => { reducedMotion = (e.target as HTMLInputElement).checked; });

function download(raw: string, filename: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export').onclick = () => {
  let raw = JSON.stringify(sim.state, null, 2);
  if (!saveAllowed && storage) { try { raw = storage.getItem(SAVE_KEY) ?? raw; } catch { /* Export in-memory state if storage fails. */ } }
  download(raw, 'inside-life-save.json'); $('#settings-note').textContent = 'Save exported. Keep the file somewhere safe.';
};
$('#import').addEventListener('change', async e => {
  const input = e.target as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  if (file.size > 100_000) { $('#settings-note').textContent = 'That file is too large to be an INSIDE LIFE save.'; input.value = ''; return; }
  const parsed = decodeSave(await file.text()); input.value = '';
  if (!parsed) { $('#settings-note').textContent = 'That save is invalid or from an unsupported version. Your current life is unchanged.'; return; }
  if (started && !window.confirm('Replace your current life with this imported save? Export your current save first if you want to keep it.')) return;
  enter(parsed); settings.close(); toast('Your saved life has been restored.');
});

view.canvas.addEventListener('pointerdown', e => {
  if (!started || paused || dialogPaused || e.button !== 0) return;
  const p = view.pick(e.clientX, e.clientY); if (!p) return;
  const nearest = [...PLACES].sort((a, b) => distance(p, a.point) - distance(p, b.point))[0]!;
  if (distance(p, nearest.point) < 1.2) { visit(nearest.id); return; }
  const path = findPath(sim.state.position, p);
  if (path.length) { sim.walk(path); closePanel(); } else toast('That spot is blocked. Try the courtyard or pavement.');
});
view.canvas.addEventListener('wheel', e => { e.preventDefault(); view.zoom(e.deltaY > 0 ? -.06 : .06); }, { passive: false });
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('input,textarea,select') || dialogPaused || !started) return;
  if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); keys.add(e.key); }
  if (e.code === 'Space' && e.target === view.canvas) { e.preventDefault(); paused = !paused; syncPause(); }
  if (e.key === 'Escape') closePanel();
}, { signal: lifecycle.signal });
window.addEventListener('keyup', e => keys.delete(e.key), { signal: lifecycle.signal });
window.addEventListener('blur', () => keys.clear(), { signal: lifecycle.signal });
document.addEventListener('visibilitychange', () => { keys.clear(); if (document.hidden) persist(); }, { signal: lifecycle.signal });
window.addEventListener('pagehide', persist, { signal: lifecycle.signal });
window.addEventListener('resize', () => view.resize(), { signal: lifecycle.signal });
window.addEventListener('storage', e => {
  if (e.key !== SAVE_KEY || !started) return;
  saveAllowed = false; paused = true; syncPause();
  $('#save-status').textContent = 'Another tab changed this save';
  toast('Another tab changed your save. Reload to use its progress, or export this life before continuing. Automatic saving is paused.');
}, { signal: lifecycle.signal });

let last = performance.now(); let accumulator = 0; let hudTime = 0; let saveTime = 0; let frame = 0;
function loop(now: number) {
  const dt = Math.min((now - last) / 1000, .1); last = now;
  const running = started && !paused && !dialogPaused && !document.hidden;
  if (running) {
    accumulator += dt; elapsed += dt;
    while (accumulator >= FIXED_STEP) {
      if (keys.size) {
        const forward = Number(keys.has('w') || keys.has('ArrowUp')) - Number(keys.has('s') || keys.has('ArrowDown'));
        const right = Number(keys.has('d') || keys.has('ArrowRight')) - Number(keys.has('a') || keys.has('ArrowLeft'));
        const length = Math.hypot(forward, right);
        if (length) {
          const dx = (-.56 * forward + .83 * right) / length * .15;
          const dz = (-.83 * forward - .56 * right) / length * .15;
          const p = { x: sim.state.position.x + dx, z: sim.state.position.z + dz };
          if (isWalkable(p)) sim.walk([p]);
        }
      }
      sim.tick(FIXED_STEP); accumulator -= FIXED_STEP; dirty = true;
    }
    if (sim.notice) { toast(sim.notice); sim.notice = ''; persist(); }
  } else accumulator = 0;
  if (started && now - lastRender >= 1000 / (batterySaver ? 30 : 60) && !document.hidden && !dialogPaused) {
    lastRender = now;
    view.render(sim.state, elapsed, sim.path.length > 0, reducedMotion);
    for (const label of view.labels()) {
      const marker = markers.get(label.id); if (!marker) continue;
      marker.style.transform = `translate(${label.x}px,${label.y}px) translate(-50%,-100%)`;
      marker.hidden = !label.visible || !started;
    }
  }
  hudTime += dt; saveTime += dt;
  if (hudTime >= .2) { updateHud(); hudTime = 0; }
  if (saveTime >= 10 && dirty) { persist(); saveTime = 0; }
  if (now > toastUntil) $('#toast').classList.add('hidden');
  frame = requestAnimationFrame(loop);
}
entry = createEntry($('#curtain'), {
  getSave: () => hasSession ? { kind: 'loaded', state: structuredClone(sim.state), recovered: false } : storage ? loadSave(storage) : loaded,
  onEnter: enter,
  onSettings: openSettings,
});
setGameAccess(false);
updateHud(); frame = requestAnimationFrame(loop);
if (import.meta.hot) import.meta.hot.dispose(() => { document.querySelector<HTMLDialogElement>('.character-creator')?.close(); persist(); entry.dispose(); lifecycle.abort(); cancelAnimationFrame(frame); view.dispose(); });
