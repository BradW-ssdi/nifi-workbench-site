# workbench/design-preview: not for building

These are the screens in the design system's own layout (its own header, rail and `css/ds.css`), for design review,
the public workbench site, and the Figma sync. Each page says so in a note at the top.

**Developers: build from `workbench/screens/`**, the same screens inside Phase 2's header, sidebar and CSS.

The screen generators (`scripts/screens/`) write here; `scripts/stamp-phase2.cjs` then writes each page into
`workbench/screens/`.
