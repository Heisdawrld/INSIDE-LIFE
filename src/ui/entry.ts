import './entry.css';
import { newGame } from '../game/simulation';
import type { GameState } from '../game/simulation';
import type { LoadResult } from '../game/save';
import { openCreator } from './creator';
import type { CharacterChoice } from './creator';

interface EntryOptions {
  getSave(): LoadResult;
  onEnter(state: GameState, fresh: boolean): void;
  onSettings(): void;
}
type Screen = 'title' | 'identity' | 'arrival' | 'experience' | 'help';
const safe = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const arrow = '<span aria-hidden="true">↗</span>';
const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`;

/** New-life drafts stay isolated until the final move-in confirmation. */
export function createEntry(host: HTMLElement, options: EntryOptions) {
  let screen: Screen = 'title';
  let draft = newGame('');
  let draftName = '';
  let creatorOpen = false;
  const abort = new AbortController();
  host.className = 'entry';
  host.setAttribute('aria-label', 'INSIDE LIFE main menu');
  host.innerHTML = `<div class="entry-art" aria-hidden="true"></div><div class="entry-shade"></div>
    <header class="entry-header"><button class="entry-brand" data-entry="title" aria-label="INSIDE LIFE main menu"><span class="entry-mark">il<span>✳</span></span>INSIDE LIFE<span class="entry-build">PLAYABLE PREVIEW</span></button><nav aria-label="Main menu"><button data-entry="experience">The experience</button><button data-entry="help">How to play</button><button data-entry="settings" aria-label="Game settings">Settings <span aria-hidden="true">⚙</span></button></nav></header>
    <div class="entry-content"></div><footer class="entry-footer"><span><i></i> ORITA STREET <b>/</b> LAGOS, NIGERIA</span><span>Single-player preview · All funds virtual <b>/</b> <small>Illustrated title artwork</small></span></footer>
    <dialog class="entry-confirm" aria-labelledby="replace-heading"><span class="entry-kicker">A NEW BEGINNING</span><h2 id="replace-heading">Leave this life behind?</h2><p>Your current save on this device will be replaced. You can export it from Settings first.</p><div class="entry-confirm-actions"><button data-confirm="cancel" class="entry-quiet">Keep my current life</button><button data-confirm="replace" class="entry-primary">Start my new life ${arrow}</button></div></dialog>`;
  const content = host.querySelector<HTMLElement>('.entry-content')!;
  const confirm = host.querySelector<HTMLDialogElement>('.entry-confirm')!;
  const steps = (step: number) => `<ol class="entry-steps" aria-label="New game progress">${['Your name', 'Your look', 'Your beginning'].map((label, i) => `<li ${i === step ? 'aria-current="step"' : ''} class="${i < step ? 'complete' : ''}"><span>${i < step ? '✓' : `0${i + 1}`}</span>${label}</li>`).join('')}</ol>`;

  function render(next: Screen, focus = true) {
    screen = next; host.dataset.screen = next;
    const save = options.getSave();
    const hasSave = save.kind === 'loaded';
    let html = '';
    if (next === 'title') {
      html = `<section class="entry-title"><div class="entry-kicker"><span></span> YOUR LIFE. YOUR STYLE. YOUR WORLD.</div><h1 tabindex="-1">INSIDE<br><span>LIFE<span class="title-period">.</span></span></h1><p class="entry-tagline">Everybody starts <em>somewhere.</em></p><p class="entry-description">Make your look. Find your feet.<br>Your Nigerian story starts here.</p><div class="entry-actions">${hasSave ? `<button data-entry="continue" class="entry-primary">Continue your life ${arrow}</button><div class="entry-save"><span class="save-avatar">${safe(save.state.name.slice(0, 1).toUpperCase())}</span><span><strong>${safe(save.state.name)}</strong><small>Day ${Math.floor(save.state.minute / 1440) + 1} · ${naira(save.state.balance)} · ${save.recovered ? 'Recovered backup' : 'Saved on this device'}</small></span><span class="save-status-dot"></span></div><button data-entry="new" class="entry-quiet">Begin a new life <span>＋</span></button>` : `<button data-entry="new" class="entry-primary">Begin your life ${arrow}</button><p class="entry-device-note">No account needed. Your progress stays on this device.</p>`}</div>${save.kind === 'invalid' ? `<p class="entry-warning">${safe(save.message)} <button data-entry="settings">Open save settings</button></p>` : ''}</section><aside class="entry-scene-note"><span>01 / MOVING IN</span><h2>A new street.<br><em>A fresh start.</em></h2><p>Your story begins on Orita Street.</p><span class="scene-line"></span></aside>`;
    } else if (next === 'identity') {
      html = `<section class="entry-flow">${steps(0)}<button class="entry-back" data-entry="title">← Main menu</button><span class="entry-kicker">FIRST, LET’S MEET YOU</span><h1 tabindex="-1">Every life starts<br>with <em>a name.</em></h1><p class="entry-description">What should your neighbours call you?</p><form id="identity-form"><label for="entry-name">YOUR NAME</label><input id="entry-name" name="name" autocomplete="off" maxlength="24" placeholder="Your name" value="${safe(draftName)}" required aria-describedby="entry-name-note"/><p id="entry-name-note" class="entry-field-note">1–24 characters. You’re creating an adult character.</p><button class="entry-primary" type="submit">Create my character ${arrow}</button></form><p class="entry-device-note">Play on this device · No email or password required</p></section><aside class="entry-starting-card"><span class="entry-kicker">EVERYBODY STARTS SOMEWHERE</span><h2>No silver spoon.<br><em>Plenty of possibility.</em></h2><div><span>01</span><p><strong>A room to call your own</strong><small>Simple furnishings. First week’s rent covered.</small></p></div><div><span>02</span><p><strong>₦12,500 to find your feet</strong><small>Virtual funds. Spend thoughtfully.</small></p></div><div><span>03</span><p><strong>A street to get to know</strong><small>Meet your neighbours. Find your first job.</small></p></div></aside>`;
    } else if (next === 'arrival') {
      html = `<section class="entry-flow entry-arrival">${steps(2)}<button class="entry-back" data-entry="identity">← Your name</button><span class="entry-kicker">CHAPTER 01 / MOVING IN</span><h1 tabindex="-1">Welcome home,<br><em>${safe(draftName)}.</em></h1><p class="entry-description">Your bags are down. The street is waking up.<br>And Aunty Bisi has already noticed the new neighbour.</p><div class="arrival-stats"><div><span>YOUR WALLET</span><strong>₦12,500</strong><small>All virtual</small></div><div><span>YOUR FIRST MORNING</span><strong>07:30</strong><small>Monday · Day 1</small></div></div><button data-entry="move-in" class="entry-primary">Enter Orita Street ${arrow}</button><button data-entry="look" class="entry-quiet">One last look at my character <span>↗</span></button><p class="entry-device-note">${hasSave ? 'Your existing life is safe until you confirm a replacement.' : 'Your life saves automatically after you move in.'}</p></section><aside class="entry-starting-card arrival-guide"><span class="entry-kicker">FIND YOUR FEET</span><h2>Small beginnings.<br><em>Your next move.</em></h2><div><span>W</span><p><strong>Explore your neighbourhood</strong><small>WASD / arrow keys, or tap an open spot to walk.</small></p></div><div><span>↗</span><p><strong>Let the street guide you</strong><small>Tap a named place to walk there. Choose an activity when you arrive.</small></p></div><div><span>✳</span><p><strong>Start with a greeting</strong><small>Find Bisi by the courtyard bench. She’ll point you towards your first opportunity.</small></p></div></aside>`;
    } else if (next === 'experience') {
      html = `<section class="entry-info"><button class="entry-back" data-entry="title">← Main menu</button><span class="entry-kicker">THE WORLD WE’RE BUILDING</span><h1 tabindex="-1">A life of your own.<br><em>A world to share.</em></h1><p class="entry-description">A Nigerian social world built around identity, style, friendship and the lives we create together.</p><div class="entry-info-grid"><article><span>01 / EXPRESS YOURSELF</span><h2>Make an entrance.</h2><p>Your avatar is your identity. Start with character creation; a wider wardrobe and personal style system come next.</p></article><article><span>02 / FIND YOUR PEOPLE</span><h2>More than neighbours.</h2><p>Shared hangouts, real-player conversations and friends are the next online milestone. This preview’s neighbours are NPCs.</p></article><article><span>03 / BUILD YOUR LIFE</span><h2>Something to show.</h2><p>Start modestly. Earn virtual money and improve your room. Personal homes and inviting friends over are part of the larger vision.</p></article></div><p class="entry-device-note">Play now: create your character, explore Orita Street, meet NPC neighbours, complete a delivery and buy your first home upgrade. Accounts, chat and multiplayer are not connected yet.</p><button data-entry="new" class="entry-primary">Begin a new life ${arrow}</button></section>`;
    } else {
      html = `<section class="entry-info"><button class="entry-back" data-entry="title">← Main menu</button><span class="entry-kicker">TAKE YOUR TIME. FIND YOUR WAY.</span><h1 tabindex="-1">Your first<br><em>few steps.</em></h1><div class="entry-info-grid"><article><span>MOVE</span><h2>Follow your curiosity.</h2><p>Use WASD or arrow keys. On any device, tap the ground or a named destination to walk there.</p></article><article><span>INTERACT</span><h2>Get a little closer.</h2><p>Choose a place, wait until you arrive, then select an activity. The progress bar shows when it finishes.</p></article><article><span>LIVE</span><h2>Look after yourself.</h2><p>Watch hunger, energy, hygiene and social needs. Your journal points you towards your next small win.</p></article></div><p class="entry-device-note">Pause whenever you need. Settings includes battery saver, reduced motion, and save export/import. Export a backup before switching devices.</p><button data-entry="settings" class="entry-primary">Open settings ${arrow}</button></section>`;
    }
    content.innerHTML = html;
    content.scrollTop = 0;
    host.querySelectorAll<HTMLButtonElement>('.entry-header [data-entry]').forEach(b => b.setAttribute('aria-current', b.dataset.entry === next ? 'page' : 'false'));
    if (next === 'identity') content.querySelector<HTMLFormElement>('form')!.addEventListener('submit', e => {
      e.preventDefault();
      const input = content.querySelector<HTMLInputElement>('#entry-name')!;
      const value = input.value.trim();
      input.setCustomValidity(!value || /[\u0000-\u001f]/.test(value) ? 'Please enter a name without control characters.' : '');
      if (!input.reportValidity()) return;
      draftName = value; draft.name = value; customize();
    });
    content.querySelector<HTMLInputElement>('#entry-name')?.addEventListener('input', e => {
      const input = e.currentTarget as HTMLInputElement; input.setCustomValidity(''); draftName = input.value;
    });
    if (focus) content.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }

  function customize() {
    if (creatorOpen) return;
    creatorOpen = true; let accepted = false;
    openCreator({ appearance: draft.appearance, shirt: draft.shirt }, (choice: CharacterChoice) => {
      draft.appearance = structuredClone(choice.appearance); draft.shirt = choice.shirt; accepted = true;
    }, () => { creatorOpen = false; if (!host.hidden) render(accepted ? 'arrival' : screen); }, { onboarding: true, name: draftName });
  }
  function start() {
    if (!draftName.trim()) { render('identity'); return; }
    const state = structuredClone(draft); state.name = draftName.trim();
    host.hidden = true; options.onEnter(state, true);
  }
  host.addEventListener('click', e => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-entry]');
    if (!button) return;
    switch (button.dataset.entry) {
      case 'new': render('identity'); break;
      case 'continue': { const save = options.getSave(); if (save.kind === 'loaded') { host.hidden = true; options.onEnter(structuredClone(save.state), false); } else render('title'); break; }
      case 'settings': options.onSettings(); break;
      case 'look': customize(); break;
      case 'move-in': if (options.getSave().kind !== 'empty') confirm.showModal(); else start(); break;
      default: render(button.dataset.entry as Screen);
    }
  }, { signal: abort.signal });
  confirm.querySelector('[data-confirm="cancel"]')!.addEventListener('click', () => confirm.close(), { signal: abort.signal });
  confirm.querySelector('[data-confirm="replace"]')!.addEventListener('click', () => { confirm.close(); start(); }, { signal: abort.signal });
  window.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || host.hidden || document.querySelector('dialog[open]') || screen === 'title') return;
    render(screen === 'arrival' ? 'identity' : 'title');
  }, { signal: abort.signal });
  render('title', false);
  return {
    show() { host.hidden = false; render('title'); },
    hide() { host.hidden = true; },
    dispose() { abort.abort(); if (confirm.open) confirm.close(); },
  };
}
