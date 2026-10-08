# INSIDE LIFE

**A Nigerian social world in development. Everybody starts somewhere.**

The first playable chapter is **Moving In**, set on fictional Orita Street in a Lagos-inspired neighbourhood. This repository starts with a small, complete single-player loop and an independent simulation foundation. It does not yet implement the planned multiplayer life simulator.

The intended product centres on real players, identity, fashion, shared hangouts and personal homes. The current local chapter is a prototype foundation, not the final social experience. Accounts, live chat and friends are the next online milestone.

## Play locally

Requirements: Node.js 22.12+ (Node 24 used for development), pnpm 11.19.0, a browser with WebGL 2.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:4173. The server binds to loopback only.

```sh
pnpm check       # strict type checking, tests, production build
pnpm preview    # serve the existing production build
```

On Windows, `Play-InsideLife.ps1` installs missing dependencies and opens the local game. No credentials are required to run it.

## What is playable

- An original illustrated title screen, real saved-character Continue card, help/settings and a name → character → arrival onboarding flow. Existing saves remain intact until explicit new-life confirmation. Return to the main menu from gameplay without losing progress.
- Create an adult character: six body presets including curvy and fuller builds, individual proportion sliders, six skin tones, four hairstyles, hair and outfit colours, rotatable full-body and face previews. Reopen the studio during play. Existing version-1 saves migrate with progress intact.
- Choose a name. Start with **₦12,500 in virtual funds**, a modest furnished room and the first week's rent prepaid.
- Walk with WASD/arrow keys, click an open floor area, or select a destination. Touch users use destination buttons or tap the ground.
- Meet Bisi, buy breakfast from Mama T, carry a spare-parts parcel to Tunde, and earn **₦3,500** once.
- Eat, rest and wash to restore needs. Buy a **₦4,500 standing fan**, visible in the room, which makes rest more effective.
- View objectives and a transaction ledger. Finish all four objectives to complete this first chapter.
- Autosave locally, resume, export/import a validated save, recover a previous valid backup, pause, reduce motion and enable battery saver.
- Explore an original procedural 3D street: cutaway room, compound, water point, shop, workshop, pedestrians, road markings, drainage and passing danfo.

The opening funds, prices and rewards are **game-balancing values**, not claims about current Nigerian living costs. There are no real-money payments, cash-out, crypto, purchase integrations or analytics.

## Honest boundaries

- **Single-player and local saves only.** Named characters are simulated. There are no connected human players or accounts.
- Ambient traffic is visual. Driving, traffic right-of-way, injury, vehicle ownership, route fares, rain/flooding and police encounters are not simulated yet.
- One delivery, one home upgrade, simple need-restoring activities. No career ladders, investment system, crime, robbery, investigations, complex relationships, household control, rent collection or full build mode yet.
- UI and simulation are separated, but this is **not a secure multiplayer economy**. Local files and browser memory can be edited. A future server must own commands, balances, ownership, transactions and saves.
- Characters use continuous CC0 anatomical meshes, a 43-bone weighted rig, body-mass deformation and fitted garment regions. The studio includes four starting looks, three garment fits, Signature/Confident/Relaxed poses, articulated fingers and a narrower Walk preview. They remain a stylized prototype: no photoreal skin, individual facial-feature sculpting, separate clothing wardrobe, cloth simulation or production animation library yet.
- Browser viewport checks do not prove sustained performance on a physical low-end phone. Hardware profiling is an explicit release gate.
- Application and fonts are bundled, but there is no installed offline/PWA cache yet.

## Structure

```text
src/game/world.ts         Shared places, collision shapes, bounded navigation
src/game/simulation.ts    Fixed-step game rules, activities, economy, objectives
src/game/save.ts          Versioned validation, backup and persistence adapter
src/render/scene.ts       Three.js scene, procedural assets, camera and rendering
src/main.ts              Browser input, HUD, panels, simulation host, lifecycle
src/style.css            Responsive visual system
tests/simulation.test.ts Economy, navigation, first chapter, save safety
docs/                    Product blueprint, technical decisions, validation
```

Read [the blueprint](docs/BLUEPRINT.md), [architecture](docs/ARCHITECTURE.md), and [validation record](docs/VALIDATION.md) before extending systems.

## Project hygiene

Commit no secrets. `.env` files are ignored. Use GitHub CLI or a credential manager to authenticate Git; never embed a token in a remote URL, script, document or issue. CI runs checks without deployment or write privileges.

Original procedural scene assets are authored in this repository. Head-mesh, font and dependency attribution is in [THIRD_PARTY.md](THIRD_PARTY.md). No project-wide public license has been selected by the owner.
