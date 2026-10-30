import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import Scene from "@/scene/Scene";
import { actFade, scrollState } from "@/game/scroll";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Index,
  head: () => ({
    meta: [
      { title: "Stripe — The Sleeping Thing" },
      {
        name: "description",
        content:
          "A 3D scrollytelling film in six scrolls. A sealed parcel opens, a stripe unrolls into the dark, and slips inside a sleeping human.",
      },
      { property: "og:title", content: "Stripe — The Sleeping Thing" },
      {
        property: "og:description",
        content:
          "A 3D scrollytelling film in six scrolls. A sealed parcel opens, a stripe unrolls into the dark, and slips inside a sleeping human.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

/* ---------- text that fades with its act, without re-rendering React ---------- */

function ActText({
  act,
  className = "",
  children,
}: {
  act: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const fade = actFade(scrollState.target, act);
        el.style.opacity = String(fade);
        el.style.transform = `translate3d(0, ${(1 - fade) * 14}px, 0)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [act]);

  return (
    <div
      ref={ref}
      className={`pointer-events-none will-change-[opacity,transform] ${className}`}
      style={{ opacity: 0 }}
    >
      {children}
    </div>
  );
}

const eyebrow = "text-[0.65rem] font-medium uppercase tracking-[0.4em] text-muted-foreground";

function Index() {
  return (
    <div data-scene-root="true" className="relative">
      {/* fixed 3D stage behind everything */}
      <div data-scene-canvas="true" className="fixed inset-0 z-0">
        <Scene />
      </div>

      {/* film grade */}
      <div aria-hidden className="vignette" />
      <div aria-hidden className="grain" />

      {/* masthead */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-baseline justify-between px-6 py-6 md:px-10">
        <span className="font-display text-xl tracking-wide text-foreground">
          Stripe<sup className="ml-0.5 align-super text-[0.55em]">®</sup>
        </span>
        <span className={`${eyebrow} hidden sm:block`}>The Sleeping Thing</span>
      </header>

      {/* six scrolls */}
      <main className="pointer-events-none relative z-10">
        {/* Act 0 — hero */}
        <section className="relative flex h-screen items-center justify-center">
          <ActText act={0} className="max-w-3xl px-6 text-center">
            <p className={eyebrow}>A film in six scrolls</p>
            <h1 className="mt-5 font-display text-[clamp(4.5rem,13vw,11rem)] italic leading-[0.9] text-foreground">
              Stripe
            </h1>
            <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
              The sleeping thing. It has been asleep inside a sealed parcel
              since the beginning of quiet.
            </p>
          </ActText>
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
            <div className="scroll-cue" />
          </div>
        </section>

        {/* Act 1 — the parcel opens */}
        <section className="relative flex h-screen items-center">
          <ActText act={1} className="max-w-sm px-8 md:ml-[8vw]">
            <p className={eyebrow}>Act one</p>
            <h2 className="mt-4 font-display text-5xl italic leading-tight text-foreground md:text-6xl">
              Carefully.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              No one has ever seen it awake. We opened the parcel the way you
              open a breath.
            </p>
          </ActText>
        </section>

        {/* Act 2 — the unrolling */}
        <section className="relative flex h-screen items-center justify-end">
          <ActText act={2} className="max-w-sm px-8 md:mr-[8vw]">
            <p className={eyebrow}>Act two</p>
            <h2 className="mt-4 font-display text-5xl italic leading-tight text-foreground md:text-6xl">
              It unrolls when it dreams.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              A stripe is only a line that hasn't decided where to end.
            </p>
          </ActText>
        </section>

        {/* Act 3 — the human */}
        <section className="relative flex h-screen items-center">
          <ActText act={3} className="max-w-sm px-8 md:ml-[8vw]">
            <p className={eyebrow}>Act three</p>
            <h2 className="mt-4 font-display text-5xl italic leading-tight text-foreground md:text-6xl">
              It met a human.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Somewhere between waking and sleep. The human was dreaming in
              olive green.
            </p>
          </ActText>
        </section>

        {/* Act 4 — the mouth */}
        <section className="relative flex h-screen items-end justify-center pb-28">
          <ActText act={4} className="max-w-md px-6 text-center">
            <p className={eyebrow}>Act four</p>
            <h2 className="mt-4 font-display text-5xl italic leading-tight text-foreground md:text-6xl">
              And it went in.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-base">
              Small things enter us all the time. Most of them are stripes.
            </p>
          </ActText>
        </section>

        {/* Act 5 — asleep again */}
        <section className="relative flex h-screen flex-col items-center justify-center">
          <ActText act={5} className="max-w-xl px-6 text-center">
            <p className={eyebrow}>Act five</p>
            <h2 className="mt-4 font-display text-6xl italic leading-[0.95] text-foreground md:text-8xl">
              Now it sleeps in you.
            </h2>
            <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground md:text-base">
              Every width you have ever loved is here.
            </p>
            <div className="pointer-events-auto mt-10">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="rounded-full border border-border bg-primary px-8 py-3 text-sm font-medium uppercase tracking-[0.25em] text-primary-foreground transition-transform hover:scale-105"
              >
                Wake it gently
              </button>
            </div>
          </ActText>
          <p className="absolute bottom-8 left-1/2 w-full -translate-x-1/2 text-center text-[0.6rem] uppercase tracking-[0.35em] text-muted-foreground/70">
            Stripe® — The Sleeping Thing · Est. during a nap
          </p>
        </section>
      </main>
    </div>
  );
}
