# INSIDE LIFE engineering contract

## Product
- A Nigerian avatar-based social world is the core direction (Avakin-like social connection/self-expression); household simulation and virtual earning support it. Prioritize real shared spaces, identity and friends before expanding solo systems.
- All funds are virtual. Do not add payments, cash-out, cryptocurrency, or real-money investment products.
- Everyone starts modestly. Do not sell or silently grant wealth to bypass progression.
- Implement a complete, measurable vertical slice before expanding to more locations or systems.
- Do not call local prototypes multiplayer, authoritative, production-ready, or fully optimized.

## Code
- Use strict TypeScript. Keep authoritative rules in `src/game`, with no DOM or Three.js imports.
- Rendering cannot grant money, advance quest completion or control game time. Input submits intentions to rules.
- Simulation uses fixed steps. Future randomness must be seeded and tied to semantic event identity, not rendering frequency.
- Monetary amounts are integer virtual naira. Validate prerequisites again at transaction commit; prevent repeat payouts.
- Treat saves and network input as untrusted. Version schemas, preserve corrupt data for recovery, and test migration before shipping it.
- Reuse geometry/materials; cap render resolution; pause hidden-tab progression; dispose resources and listeners.
- Avoid hard-coded user-specific filesystem paths or credentials in tracked source.

## Quality gate
- Run `pnpm check` before pushing meaningful changes. Add tests for important invariants and failure modes, not markup snapshots.
- Inspect the actual game at desktop and narrow viewports after UI/scene changes. Record limitations honestly.
- Keep the README and validation record aligned with implemented behavior.
- Push requested changes after checks. Deployment and unrelated external communications require their own user authorization.
- Do not spawn agents unless the user explicitly requests parallel agent work.
