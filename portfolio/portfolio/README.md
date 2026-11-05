# Cinematic Portfolio — HTML · CSS · Vanilla JS

A dark, cinematic personal portfolio: real background video, a ray-marched liquid-chrome
WebGL centerpiece, scroll-driven storytelling and premium micro-interactions — with no
frameworks and no build step.

## Run it

Open `index.html` directly, or (recommended, so video/fonts behave like production) serve
the folder:

```bash
cd portfolio
python3 -m http.server 8000   # then visit http://localhost:8000
```

Add `?nowebgl` to the URL to preview the static CSS fallback.

## Make it yours

| What | Where |
| --- | --- |
| Name, initials, role, email, social links, availability | `SITE_CONFIG` at the top of `js/main.js` |
| About text, philosophy, stats | `index.html` → `#about` (marked `EDIT`) |
| Skill categories & tools | `index.html` → `#skills` |
| Projects (image, title, copy, tech, category, year, link) | `index.html` → `#projects` |
| Timeline roles & details | `index.html` → `#experience` |
| Portrait | replace `assets/images/profile-placeholder.webp` (4:5) |
| Project images | replace `assets/images/project-0X.webp` (16:10) |
| Lab gallery | replace `assets/images/lab-0X.webp` (4:5) |
| Colours, fonts, spacing | tokens in `:root` of `css/style.css` |

Leave a social URL empty (`''`) in `SITE_CONFIG` to remove that link everywhere.
The project links currently point to `example.com` placeholders.

## Structure

```
index.html
css/
  style.css         tokens, base, layout, components
  animations.css    keyframes, reveal states, hero intro, reduced-motion overrides
  responsive.css    laptop / tablet / mobile / touch adaptations
js/
  main.js           SITE_CONFIG, shared ticker, scroll + pointer state, Lenis, preloader, boot
  animations.js     splitText, reveal observer, counters, parallax, scroll-lit words,
                    magnetic buttons, scroll progress, scroll scenes, marquee, hero intro
  cursor.js         custom cursor with hover / "view" label states (fine pointers only)
  interactions.js   hero video, nav + mobile menu, particles, skills accordion,
                    horizontal gallery, signature scroll scene, timeline, contact
  three-scene.js    WebGL liquid-chrome ray-marcher (hero + signature scenes)
  vendor/lenis.min.js   smooth scrolling (MIT), vendored for offline use
assets/
  videos/   hero-desktop.mp4 (1280×720) · hero-mobile.mp4 (540×960)
  images/   posters, portrait placeholder, project + lab images
  fonts/    Archivo (variable, width + weight), Instrument Serif, JetBrains Mono
  textures/ grain.png
  models/   (unused — the 3D object is procedural, see below)
```

## Reusable animation API

Everything is driven by data attributes, so new content animates without touching JS:

- `data-reveal="fade-up | lines | clip | scale"` — reveal on scroll (`data-stagger` on a parent staggers children, `data-delay="200"` adds ms)
- `data-split="chars | words"` — split text into animatable spans (accessible label preserved)
- `data-scroll-words` — words light up as the paragraph scrolls past
- `data-parallax="0.15"` — parallax offset (negative = opposite direction)
- `data-magnetic="0.3"` — magnetic hover strength
- `data-count="60"` (+ optional `data-count-from`) — animated counter
- `data-cursor="view" data-cursor-label="Open"` — custom cursor lens with label

From JS: `Portfolio.anim.splitText(el)`, `Portfolio.anim.scrollScene(el, p => …)`,
`Portfolio.ticker.add((time, dt) => …)`, `Portfolio.scrollTo('#id')`.

## Media & licensing

All footage and imagery are **original, generated for this project** — no stock assets,
no attribution requirements:

- The hero video is a seamless 12-second loop of procedurally rendered "liquid silk",
  encoded as H.264 (≈0.8 MB desktop, ≈0.4 MB mobile).
- Project images are stills rendered from the site's own WebGL shader.
- Fonts are OFL-licensed (Archivo, Instrument Serif, JetBrains Mono); Lenis is MIT.

To use stock footage instead (e.g. from Pexels, Pixabay or Mixkit), download a clip, check
its licence page, compress it (≈1280px wide, H.264, CRF 26–28, no audio), save it to
`assets/videos/`, and update the two `<source>` tags plus `assets/images/hero-poster*.webp`.

## 3D notes

Rather than loading Three.js (~170 KB) for a single object, `three-scene.js` ray-marches
signed-distance-field metaballs in one fragment shader: smooth-union "liquid" blobs,
a procedural studio environment for chrome reflections, iridescent fresnel and a glow halo.
The signature section morphs merge → split → ring as you scroll. Scenes render only while
visible, pause in background tabs, cap pixel ratio, and lower their resolution automatically
if frames run slow. Without WebGL a CSS chrome fallback is shown.

## Accessibility & performance

- Skip link, landmarks, `aria-current` nav, accessible accordion/timeline toggles,
  focus-trapped mobile menu (Esc closes), visible focus styles
- `prefers-reduced-motion`: no smooth scroll, no autoplaying video, static 3D frame,
  instant reveals, scroll-driven text shown in full
- Save-Data: the hero video is skipped and the poster is shown
- Single `requestAnimationFrame` loop; layout measured on resize only; offscreen
  canvases, video and CSS loops are paused; touch devices get a lighter particle field
  and lower 3D resolution
- The preloader tracks real readiness (fonts, page load, video `canplay`) — no fake delay
