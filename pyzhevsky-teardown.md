# pyzhevsky.estate: teardown and rebuild guide

Inspected 2026-11-05 in a real browser at 1024×768, by reading the shipped JS and CSS and sampling the page at 11 scroll positions.

**Evidence labels:** *Observed* means read directly from shipped code, DOM or network. *Inferred* means my interpretation of what I read.

**Not checked:**
- Mobile layouts
- Inner pages (`/flats`, `/map`, `/about` and others)
- Hover states and the custom cursor, beyond what the CSS and JS show
- The backend (it isn't visible from outside)

---

## 1. The main finding

It looks like WebGL, but it isn't. I found **no WebGL, Three.js or GSAP** in any bundle I read. The effect comes from four simple things used with a lot of discipline:

1. **Pinned sections** (`position: sticky`) that are 2–4 screens tall
2. **One scroll engine** that drives `transform`, `clip-path` and `opacity` from scroll position
3. **Two easing curves** used almost everywhere
4. **Excellent photography and renders**, plus a subtle moving shadow

So you can get most of the feel without any 3D work. The limiting factor is the quality of the images and how carefully the scroll is choreographed.

---

## 2. The stack (observed)

| Layer | What they use |
|---|---|
| Build | Vite/Rolldown (`rolldown-runtime.js`, hashed lazy chunks) |
| Page delivery | Server-rendered HTML, about 336 KB, behind Cloudflare. Backend unknown |
| DOM and plugin system | **jQuery** plus a custom `data-plugin="..."` auto-init framework |
| Smooth scroll | **Lenis**, `lerp: 0.1`, wrapped in a `<vig-smooth-scroll>` web component with a shadow DOM |
| Page transitions | **Barba.js 2.10.3** |
| Text splitting | **Splitting.js** (`splitChars`, `splitLines`) |
| Scroll animation | **Custom `parallax` plugin**, on 153 elements on the landing page |
| Moving shadows | Custom **Canvas 2D**, lazy-loaded |
| Area and floor plans | Custom SVG-based `plan` plugin (no canvas or WebGL in that chunk) |
| Other | Service worker, Yandex SmartCaptcha, cookie consent, favourites and PDF export |

The footer links to the agency **Vide Infra** (`videinfra.com`). The `vig-` prefix on the custom element fits that, so they are probably the builder (inferred).

**Page numbers:** 27,484 px of scroll at a 768 px viewport (about 36 screens), 54 images, 8 videos, 11 canvases, about 1,545 DOM nodes. The main JS bundle is about 504 KB before compression.

---

## 3. Visual system (observed)

**Type: two fonts with very different voices**
- Display: **Halvar Breitschrift**, an ultra-wide grotesque, uppercase, used for huge titles and tiny tracked-out labels
- Body: **ITC Garamond Light**, a large, quiet serif for lead paragraphs

**Colour: warm stone, never pure black or white**

`#12100e` · `#2f2b27` · `#5f5a52` · `#75736d` · `#a19f98` · `#bdb6a9` · `#d5cec1` · `#f7f2e8` · `#fffefb`

Signature gradient: `linear-gradient(180deg, #12100e, #5f5a52)`

**Layout:** a 3-column grid with thin vertical hairlines that stay visible (`grid-lines`), like a drawing grid. These lines animate in by scaling on `scaleY`. Sections switch between `ui-dark` and `ui-light`, and the fixed header changes theme to match.

**Motion: two curves do almost all the work**

| Token | Value | Used for |
|---|---|---|
| `--ease-curtain` | `cubic-bezier(.7, 0, .4, 1)` | Clip reveals, wipes, preloader |
| `--ease-settle` | `cubic-bezier(.25, .74, .22, .99)` | Text arriving |
| Scroll curve in | `t²` | Pinned section leaving |
| Scroll curve out | `2t − t²` | Pinned section arriving |

Standard durations are **1.6 s** for text and intro moves, **1.2 s** for hover wipes and **0.8 s** for page transitions. Long, slow transitions are a big part of why it reads as expensive.

---

## 4. Animation catalogue

### Preloader → intro (observed)
1. Full-screen gradient with the two grid lines, plus "LOADING" and a `%` counter. Scroll is locked.
2. Progress blends a 1,500 ms minimum timer with real image loading, smoothed and written to a `--progress` CSS variable.
3. Images are tagged by priority, so only the `intro` set blocks the preloader. The rest load afterwards.
4. On completion these run together, each 1.6 s with a 0.4 s delay:
   - Intro video: `clip-path: inset(100% 0 0 0)` → `inset(0)`, plus `translateY(5%)` → `0`
   - Right-hand facade panel: `inset(0 0 0 100%)` → `inset(0 0 0 66.66%)`
   - Logo letters rise in with a 50 ms stagger, tagline characters with a 10 ms stagger
5. Scroll unlocks.

### Hero → facade wipe (observed)
The right third is a preview of the next section. As you scroll, its `clip-path` opens from `inset(0 0 0 66.66%)` to `inset(0)` over one screen, while the image inside grows from `scale(.77)` to `scale(1)`. The two sections are stacked, not placed one after the other, and this is probably the best single moment on the site.

### Stacked sections (observed)
Pinned content moves **down** at the same time the next section slides up over it (`translateY(0)` → `translateY(100svh)`, eased with `t²`). This gives a parallax-depth feel at every section change. `sticky--under-next` and `sticky--under-previous` control it.

### Exploded letter titles (observed)
Words like `F A C A D E` are split into separate `<div>`s spread across the viewport. Each letter has a stagger value (`-4.5` to `2.5`) and slides in on X from an offset, with centre letters and outer letters moving by different amounts. A title can also part to let an image rise through the gap (the `APART▮ENTS` shot).

**Accessibility:** the real heading is a visually hidden `<h2 class="sr-only">`, and the letters are `aria-hidden`.

### Text reveal (observed)
Text is split into lines and words. Each word starts `opacity: 0; filter: blur(20px); translateY(100%)` and settles over 1.6 s with a 40 ms stagger per line. It plays forward on enter and has a separate out-animation on leave.

### Image reveals (observed)
- **Centre-out wipe:** `inset(50% ...)` → `inset(0)`, in the residence and lobby sections
- **Split-open:** a `polygon()` with 8 points parts down the middle, in the courtyard section
- **Grow to fill:** `inset(31.4% 25vw)` → `inset(0)` with a scale from `.85` → `1` → `1.15`, in services

### Image drift inside its frame (observed, 24 uses)
The image is larger than its frame and translated by scroll progress multiplied by the overflow. It's subtle, but it keeps every photo slightly alive.

### Day → night facade (observed)
Two identical-camera renders are stacked, and the night image's opacity runs 0 → 1 across a pinned section. It costs almost nothing and looks impressive.

### Column hover video (observed)
On facade cards, a video is hidden behind `clip-path: inset(0 50%)` and opens to `inset(0)` on hover over 1.2 s.

### Film grain (observed)
A tiled `noise.webp` on a pseudo-element at 37.4% opacity, larger than its box (`inset: -50%`), jumped around by `steps(11)` keyframes every 0.1 s. It's turned off for reduced motion.

### Moving leaf shadows (observed, the signature detail)
There's no video here. The pipeline is:
1. Load a photo of a branch on a white background.
2. Convert brightness to alpha, keep only the largest connected shape, and blur it with a triple box blur.
3. Cut out each leaf as a sprite, with a stem point and a tip point.
4. Each frame, rotate the whole stem slightly. Each leaf also rotates around its base and squashes along its own axis to fake 3D flutter.
5. Tint with `source-in`, then draw at a low alpha (about 0.2–0.3) on a **half-resolution** canvas, so the shadow stays soft and cheap.

Wind is three layered sine waves with a golden-ratio period (`1.618`) so it never visibly loops, multiplied by a slow gust envelope.

A simpler relative, `shadowLines`, draws six tapered diagonal bars at about 38° that drift slowly, like light through blinds.

### Performance discipline (observed)
- Canvas modules load through dynamic `import()`, triggered when the element is within 50% of view
- Animation loops stop when off-screen (`IntersectionObserver`) or when the tab is hidden
- `shadowLines` caps pixel count (1.5M, or 650k on touch) and runs at 30 fps on touch devices
- Images load a small `@xs` version first, then the size that fits
- `prefers-reduced-motion` is honoured throughout; most scroll effects are limited to `md-up`

---

## 5. How the scroll engine is written

Each element declares keyframes as `parallax-<viewport%>-<element%>`, meaning "the scroll position where this point of the element reaches this point of the viewport" (inferred from the constraint maths):

| Key | Meaning | ScrollTrigger equivalent |
|---|---|---|
| `parallax-100-0` | Element top at viewport bottom | `top bottom` |
| `parallax-0-0` | Element top at viewport top | `top top` |
| `parallax-0-100` | Element bottom at viewport top | `bottom top` |
| `parallax--100-0` | One screen past pin start | `top+=100% top` |

Values are parsed and interpolated numerically, then written with `.css()`. Reads and writes run in separate queues to avoid layout thrashing. About 40 named patterns (`facadeIntroClip`, `lobbyMiddleClip` and so on) hold the choreography.

**You don't need to rewrite this.** GSAP ScrollTrigger does the same job.

---

## 6. Recommended rebuild

I wouldn't copy their jQuery setup. It makes sense for an agency with an existing in-house framework, but a new project doesn't need it.

| Their tool | Use instead | Why |
|---|---|---|
| Server templates | **Astro** | Static, fast, content collections suit a project list |
| jQuery plugins | Small vanilla modules | Nothing to carry over |
| Custom parallax | **GSAP ScrollTrigger** | Mature and well documented |
| Splitting.js | **GSAP SplitText** | Handles lines and resizes |
| Lenis | **Lenis** | Same tool |
| Barba | **Astro View Transitions** | Built in |
| Canvas 2D shadows | Canvas 2D, same technique | Cheap and distinctive |

**Fonts:** both of theirs are commercial and need a licence. Free options with a similar character:
- Wide display: *Syncopate*, *Michroma* or *Krona One*
- Serif: *Cormorant Garamond* or *EB Garamond*

### Starter recipes (my own code, not yet run)

**Tokens**
```css
:root {
  --ink: #12100e; --stone-700: #5f5a52; --stone-300: #bdb6a9; --paper: #f7f2e8;
  --ease-curtain: cubic-bezier(.7, 0, .4, 1);
  --ease-settle: cubic-bezier(.25, .74, .22, .99);
}
```

**Smooth scroll wired to ScrollTrigger**
```js
const lenis = new Lenis({ lerp: 0.1 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

**Hero → next-section wipe**
```js
gsap.fromTo('.next-section',
  { clipPath: 'inset(0% 0% 0% 66.66%)' },
  { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power1.out',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=100%', scrub: true } });
```

**Word reveal**
```css
.word { opacity: 0; filter: blur(20px); transform: translateY(100%);
  transition: all 1.6s var(--ease-settle);
  transition-delay: calc(var(--line) * 40ms); }
.is-in .word { opacity: 1; filter: none; transform: none; }
```

**Before → after on scroll**
```js
gsap.to('.night', { opacity: 1, ease: 'none',
  scrollTrigger: { trigger: '.pin', start: 'top top', end: 'bottom bottom', scrub: true } });
```

**Non-repeating wind for the shadow canvas**
```js
const wind = (t, period, phase) =>
    Math.sin(t * 6.283 / period + phase) * .6
  + Math.sin(t * 6.283 / (period * 1.618) + phase * 2.1) * .3
  + Math.sin(t * 6.283 / (period * .53) + phase * .7) * .1;
```

Respect reduced motion from day one:
```js
gsap.matchMedia().add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
  /* all scroll choreography goes here */
});
```

---

## 7. Adapting it for an architect

This site sells one building. A portfolio has to show many projects, so the same techniques need different jobs:

| Technique | Use on an architect's site |
|---|---|
| Hero wipe | Studio name → the signature project |
| Day → night | **Sketch → render → built photo**, or plan → finished building. This is the strongest idea to carry over |
| Facade triptych | Three material and construction close-ups per project |
| Grid hairlines | Tie them to the drafting grid, as part of the identity |
| Exploded letters | Project names |
| Leaf shadows | Shadow of a real tree from one of the projects, or a moving sun-path shadow |
| SVG area map | Map of built work, or an interactive floor plan |
| Location walk-times | Project facts: area, year, site, materials |

**Suggested first version**
- Preloader, then hero
- 3–4 featured projects, each with one sketch-to-built moment
- About the studio, then contact
- A simple project index page

That's about 8–12 screens of scroll, not 36. Fewer sections done carefully will come across better than a thin copy of the full site.

**What you'll need from your friend:** 10–20 high-quality images per featured project. If the photography is weak, this style exposes it, so sort this out before building anything.

---

## 8. Keeping it yours

Use the *techniques* freely, but don't copy their assets. Their photos, renders, videos, copy and logo belong to them, the fonts need licences, and the JS should be rewritten rather than lifted. That includes the branch sprites and their coordinates: photograph or draw your own branch. Starting from your friend's own colour and type will also stop it looking like a clone of this site.
