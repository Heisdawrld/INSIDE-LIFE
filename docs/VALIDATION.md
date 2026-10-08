# First chapter validation

Development environment: Windows, Node 24, pnpm 11.19.0, Chromium-based in-app browser. Checked 2026-10-08.

## Automated gates

`pnpm check` runs strict TypeScript, Vitest and a production Vite build. 47 tests cover command prerequisites, integer virtual funds, no duplicate delivery reward, cancellation, bounded needs/time, complete first-chapter balance, paths between every destination pair, invalid/corrupt saves, backup recovery, appearance validation, v1 migration, indexed head-asset integrity, normalized body weights, bone hierarchy and finite/reproducible animation across presets and extreme proportions.

`pnpm audit --prod` and `git diff --check` are additional repository checks. CI repeats the check command with a frozen lockfile on Node 24.

Local checks passed. The initial GitHub Actions run (37607832216) could not start a runner: GitHub reported "The job was not started because your account is locked due to a billing issue." No CI test execution occurred. Account-owner resolution and a subsequent successful CI run are still required.

## Browser observations

- Desktop: scene and interface render; the production test save reloads with all four objectives completed and virtual balance 10,100 (includes an additional breakfast). Character editing preserves these completed objectives and balance.
- Character studio: Curvy preset changes proportion controls; outfit changes appear in the preview. Saving and reloading retains feminine frame, curvy proportions, bun and green outfit. Body and face views and rotation are available.
- The body revision replaces independent limb primitives with continuous weighted anatomy. Front and side views plus the new Walk preview were inspected. Clothing is still a close fit and fingers now retain 30 individual joints with a relaxed curl; neither should be described as production realism.
- Narrow 390 × 844 viewport: welcome screen fits; character preview, scrolling controls and save button are usable. These are viewport checks, not a physical-phone benchmark.
- Existing local v1 progress can load into the v2 application; migration also has an automated regression test.

## Known limitations and release gates

- This is a local, single-player first chapter, not a production or multiplayer release.
- Character art remains stylized. Clothing junctions, hairlines, facial materials, expression and limb deformation need further art work. It is not photorealism.
- Current production build warns about JavaScript chunks larger than 500 kB; sculpted head data and Three.js dominate. Shipping should budget compressed assets, draw calls, memory and load time on actual target phones and add mesh detail reduction.
- Sustained frame rate, thermal behavior, touch on physical devices, all browsers, accessibility and visual regression coverage have not been established.
- Browser storage may be cleared by the user/browser; export saves for a portable backup. No cloud save or installed offline cache is promised.
- Police, robbery, EFCC investigations, investments, driving and online social play are roadmap items, not implemented mechanics.


## Entry and character follow-up, 2026-10-08

- Verified a fresh name → studio → arrival → gameplay flow on isolated localhost port 4175. Returning to the title and reloading displayed the saved Amara character and virtual balance.
- Added four complete starter looks, three garment fits, three studio poses, a feminine hand-at-hip signature pose and a squarer masculine default. Narrowed the leg stance, relaxed wrists/fingers and reduced world travel speed to 1.65 units/second (1.0 when tired).
- Inspected feminine signature and masculine relaxed/walking previews from front and three-quarter views. Verified the Tobi appearance and relaxed fit persist after saving, reloading and reopening the studio.
- Inspected the updated studio at 390 × 844: preview, look selection, pose controls, scroll region and save action fit. Restored the viewport afterwards. No captured console errors on the isolated production QA tab.
- Automated checks additionally cover optional wardrobe compatibility, rejecting unknown wardrobe values and uncrossed feet at near-equal heights across every body preset and studio pose.
- Remaining art limitations: procedural animation lacks planted-foot IK and authored transitions; garment fits share the anatomical topology, with visible sleeve/hem artifacts; face, hair and surface detail remain prototype quality. These changes do not establish Avakin-level visual quality.
- Build still reports a large JS chunk; no new physical-device performance claim is made.
