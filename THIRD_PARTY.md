# Attribution and external resources

- Three.js — MIT license. Version pinned in `pnpm-lock.yaml`.
- DM Sans variable font — SIL Open Font License, distributed through `@fontsource-variable/dm-sans`.
- Manrope variable font — SIL Open Font License, distributed through `@fontsource-variable/manrope`.
- Vite, TypeScript, Vitest and supporting packages retain their respective upstream licenses. See their installed package license files and lockfile versions.

- Adult head meshes in `src/assets/human-head.json` derive from MakeHuman graphical assets, dedicated to CC0. Source: https://github.com/makehumancommunity/makehuman at commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. Inputs: `makehuman/data/3dobjs/base.obj` and the `african-female-young.target` / `african-male-young.target` graphical targets. These filenames are upstream asset identifiers, not restrictions on player identity. Original importer: `scripts/import-human-head.py`. It applies the adult shapes, rescales, clips the head at the neck and exports indexed meshes. License text: `public/licenses/MakeHuman-CC0.txt`. The AGPL application code is not copied or linked. Upstream licensing explanation: https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md.

Fonts ship with the app; no runtime Google Fonts request is required. Apart from the attributed heads, scene meshes, signs, icon paths, UI and game text are created for this repository. No assets were extracted from Lagos Life or The Sims.

Real-world place/cultural references inform the fictional setting. This project has no affiliation with those games or with a government agency. Public licensing of the original project remains the owner's decision.
