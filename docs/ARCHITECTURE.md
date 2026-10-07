# Technical decisions

## ADR 001 · Browser-first first chapter

Use TypeScript, Vite and Three.js for the initial accessible local build. The user has not chosen a final commercial device matrix. Browser-first is the working assumption because it supports quick PC/phone feedback without store installation. Reassess if native mobile or high-detail PC simulation becomes the primary product.

The renderer is an adapter. Game data/rules are independent of Three.js. This reduces migration cost but does not make an engine switch free. Do not add React, an ECS framework, a physics engine, a server or a database without a concrete need.

## ADR 002 · One owner of simulation time

Browser host accumulates elapsed time and runs `Simulation.tick(1/20)`; rendering reads state. Hidden tabs and explicit pause stop progression. Long suspended-frame deltas are capped; no offline income is promised. Needs, walking and activities advance from the same ticks. The presentation currently uses simplified need restoration and procedural animation, not a complete physical human simulation.

Ambient pedestrians/danfo are renderer-only decoration. They cannot harm players or award money. Future traffic interactions must move into simulation before they affect outcomes.

## ADR 003 · Commands and money

`start(action)` checks distance, activity state, affordability and progression prerequisites. Completion revalidates before an atomic balance/ledger/progression change. Cancellation has no cost/reward. The parcel state machine is `available → carrying → delivered`; it cannot pay twice. Fan ownership gates repeat purchase. Ledger entries are integer-naira transactions with monotonic IDs.

This is a local simulation and has no anti-tamper guarantee. Future multiplayer requires server-owned commands and persistent transactions, identity-bound idempotency keys, authorization, schema validation, rate limits and atomic database writes. Do not reuse client ledger claims as proof of ownership or payment.

## ADR 004 · Navigation

Shared obstacle rectangles and bounded half-metre four-neighbour BFS provide short routes. Each movement step is collision-checked. A new destination cancels the prior route/activity. Tests traverse every gameplay destination pair. This is sufficient for the small map; larger worlds need hierarchical navigation and NPC avoidance. Avoid replacing it with unbounded searches in rendering frames.

## ADR 005 · Local persistence

Save version 2 stores meaningful game state and bounded adult appearance values, not meshes or animations. Version 1 migrates with a default appearance and unchanged progression. The storage key retains its v1 suffix to discover existing saves. Validate unknown JSON before use: finite bounded values, allowed enums/colours, safe integer money, walkable position and ordered ledger IDs. Saving preserves the previous valid snapshot as backup. Unsupported/corrupt saves are not automatically overwritten. Import replaces a running life only after user confirmation. Export supports recovery and device movement.

Actions/routes are transient and cancelled by reload. Completed actions save immediately; routine progression autosaves every ten seconds and on page hide. Browser storage quota/security failures are visible. Concurrent-tab writes pause autosaving in the other active tab to reduce accidental overwrites. This is not a distributed lock or cloud sync system.

## ADR 006 · Rendering and lifecycle

Reuse simple geometry and cached materials, self-host fonts, cap pixel ratio (1.5 normal / 1 battery saver), use one shadow-casting light and disable dynamic shadows in saver mode. Cap rendering to 30 FPS in saver mode and 60 otherwise; actual frames depend on hardware. Small-screen default is saver mode. Mobile camera follows the player. No WebGL state is serialized. Dispose geometries, materials, textures, listeners and loops during replacement.

Future asset work should define polygon/material/texture/draw-call budgets on real target devices before expanding detail. A shader-heavy photorealistic art direction is not assumed.

The character studio edits an isolated draft; closing cancels it, saving applies appearance without changing economic state. It pauses world simulation/rendering and disposes its preview renderer and replaced geometry. Heads and continuous anatomical bodies derive from pinned CC0 graphical assets, see THIRD_PARTY.md. Original code maps the asset weights to a 13-bone skeleton, adapts body mass/proportions and drives deterministic walking. Garment regions are smoothed and split at hems; shoes are separate meshes attached to foot bones. These are fitted garment surfaces, not simulated cloth or a separate wardrobe system. Asset detail, draw calls and walking deformation still need production optimization and art review. Current head/body topology is roughly 28,000 triangles per character before accessories; do not multiply crowds without profiling and adding distance-based detail reduction.

## ADR 007 · Accessibility and input

Native buttons expose equivalent destination/activity controls for canvas interactions. Keyboard supports WASD/arrows, destination buttons and focused-canvas Space pause. Focus indicators, named controls, reduced ambient motion, visible need values, pause and responsive panels are included. Canvas scene content is not a complete screen-reader experience; further accessibility testing is required. Touch controls currently use tap destinations, not a virtual joystick.
