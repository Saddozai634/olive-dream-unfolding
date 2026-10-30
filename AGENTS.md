<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Architecture decisions

- The `/` landing page is a 3D scrollytelling experience: `src/routes/index.tsx` renders a fixed R3F `<Canvas>` (route `ssr: false`) plus six full-height HTML text sections; scene code lives in `src/scene/`, pure scroll/act math in `src/game/scroll.ts` (no React, no three — unit-tested in `src/test/scroll-narrative.test.ts`).
- Per-frame state (scroll progress, camera, plane opacities, stripe drawRange) is mutated in one `useFrame` in `src/scene/Scene.tsx` `Director`; overlay text fades are driven by rAF style writes keyed off `scrollState`, never React state.
- Photoreal imagery (parcel, sleeper, mouth) lives in `public/images/*.jpg` and is drawn on edge-masked shader planes (`FramedPlane`) so it blends into the olive fog; the stripe itself is a procedural ribbon (`src/scene/stripe-geometry.ts`) unrolled via `setDrawRange`. Do not replace these with illustration-style assets — the look must stay photoreal, not cartoonish.
- Photoreal imagery (parcel, sleeper, mouth) lives in `public/images/*.jpg` and is drawn on edge-masked shader planes (`FramedPlane`) so it blends into the olive fog; the stripe itself is a procedural ribbon (`src/scene/stripe-geometry.ts`) unrolled via `setDrawRange`. Do not replace these with illustration-style assets — the look must stay photoreal, not cartoonish.

