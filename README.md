# Shreya Sweets & Restaurants — Website

A cinematic, animated, single-page website for **Shreya Sweets & Restaurants**, a vegetarian restaurant and sweets shop on Rajpura Bypass Road, Bhadohi, Uttar Pradesh. It's built with plain HTML, CSS and JavaScript. There's no build step and no framework.

## Run it

**Option 1: just open it.** Double-click `index.html`. Everything works from `file://`.

**Option 2: a local server.** Recommended for testing video autoplay and mobile devices on your Wi-Fi.

```bash
cd shreya-sweets
python -m http.server 8080        # then open http://localhost:8080
# or
npx serve .
```

An internet connection is needed for the Google Fonts, the animation libraries (GSAP, ScrollTrigger and Lenis from a CDN) and the current stand-in photos. If the CDN is unreachable, the site still loads fully, just without the scroll animations.

## Project structure

This project lives in `shreya-sweets-vanilla/`, because `shreya-sweets/` already holds an earlier React/Vite version of the site. Rename the folder freely; all paths are relative.

```
shreya-sweets-vanilla/
├── index.html            All sections and markup
├── css/
│   ├── style.css         Design tokens, layout, every section
│   ├── animations.css    Keyframes, gradient-text fix, reduced-motion rules
│   └── responsive.css    Laptop / tablet / mobile / small-phone breakpoints
├── js/
│   ├── main.js           ★ SITE data (edit here), rendering, preloader
│   ├── animations.js     GSAP + ScrollTrigger + Lenis choreography
│   ├── cursor.js         Custom cursor + magnetic buttons (desktop only)
│   └── interactions.js   Nav, mobile menu, menu tabs, lightbox, hero video
├── assets/
│   ├── videos/           Put hero.mp4 here
│   ├── images/           Put your own photos here
│   └── icons/            favicon.svg, placeholder.svg (broken-image fallback)
└── README.md
```

## Editing content

Everything you'd normally change lives in the `SITE` object at the top of **`js/main.js`**.

<table>
  <thead>
    <tr><th align="center"><b>Sr No</b></th><th align="center"><b>What</b></th><th align="center"><b>Key in <code>SITE</code></b></th><th align="center"><b>Notes</b></th></tr>
  </thead>
  <tbody>
    <tr><td align="right">1</td><td align="left">Google review count</td><td align="left"><code>reviewCount</code></td><td align="left">Currently <code>224</code>. It updates every counter on the page.</td></tr>
    <tr><td align="right">2</td><td align="left">Opening hours</td><td align="left"><code>hours</code></td><td align="left">Leave empty until you've confirmed them. Until then, the page says "Please call us to confirm today's timings."</td></tr>
    <tr><td align="right">3</td><td align="left">Genuine reviews</td><td align="left"><code>reviews</code></td><td align="left">Exact text only, e.g. <code>{ name: 'Rahul', text: '…', source: 'Google' }</code>. Hidden while empty.</td></tr>
    <tr><td align="right">4</td><td align="left">Google Map embed</td><td align="left"><code>mapEmbedUrl</code></td><td align="left">In Google Maps, open the restaurant's listing, then Share → Embed a map, and copy only the <code>src</code> URL. While this is empty, a styled "Open in Google Maps" card shows instead.</td></tr>
    <tr><td align="right">5</td><td align="left">Menu items &amp; prices</td><td align="left"><code>menu</code></td><td align="left">Add <code>price: '₹180'</code> to an item when prices are confirmed. Items without a price show <b>Ask for Price</b>, which opens a call.</td></tr>
    <tr><td align="right">6</td><td align="left">Signature dishes</td><td align="left"><code>signature</code></td><td align="left">Name, tag, short text and image key.</td></tr>
    <tr><td align="right">7</td><td align="left">Photos</td><td align="left"><code>images</code></td><td align="left">One central map. Change a value to <code>'assets/images/your-file.jpg'</code>.</td></tr>
    <tr><td align="right">8</td><td align="left">Photo credits</td><td align="left"><code>photoCredits</code></td><td align="left">Remove a row when you replace that stand-in photo.</td></tr>
    <tr><td align="right">9</td><td align="left">Gallery</td><td align="left"><code>gallery</code></td><td align="left">An image key, a caption and <code>h: 'tall'</code> or <code>'short'</code>.</td></tr>
    <tr><td align="right">10</td><td align="left">Hero video</td><td align="left"><code>hero.videos</code></td><td align="left">Looks for <code>assets/videos/hero.webm</code> and <code>hero.mp4</code>.</td></tr>
  </tbody>
</table>

The phone number, the Google listing link and the Get Directions links (`https://www.google.com/maps/dir/?api=1&destination=…`) are all generated from `SITE.phone`, `SITE.tel`, `SITE.address` and `SITE.googleListing`.

## ⚠ Media checklist (please read)

1. **The photos are licensed stand-ins.** The 23 photos in `assets/images/` are openly licensed Wikimedia Commons images (CC0, CC BY or CC BY-SA). All of them are vegetarian Indian food, sweets, tandoor or dining rooms, and they're stored locally, so they work offline. Their licences require credit, so the footer has a **Photo credits** list, generated from `SITE.photoCredits`. **They are not photos of Shreya's own dishes or premises.** For example, the "Tandoori Soya Chap Tikka" card shows paneer tikka.
2. **Use real photos of the restaurant.** Your own paneer dishes, tandoor, sweets counter and dining hall will always beat stock photos, and they'll be sharper. The stand-ins are 960px wide, which looks slightly soft in the full-screen hero. Put your photos in `assets/images/`, update `SITE.images`, and delete the matching rows from `SITE.photoCredits`. If any image fails to load, a branded placeholder shows instead.
3. **No hero video is included.** Add a short clip (10–20 seconds, under 6 MB, no audio) as `assets/videos/hero.mp4`. Good sources are Pexels, Pixabay, Mixkit or Coverr, or a clip of your own kitchen. Until you add one, the hero shows a cinematic cross-fading photo slideshow. The slideshow is also used automatically on data-saver connections and for visitors who prefer reduced motion.

## Scroll-driven cooking background

[js/cooking.js](js/cooking.js) paints a cooking story on a fixed canvas behind the whole page. Scrolling down cooks the dish, and scrolling back up rewinds it. Each chapter is tied to a page section, so the story stays in step with the content even if sections change length.

<table>
  <thead>
    <tr><th align="center"><b>Sr No</b></th><th align="center"><b>Chapter</b></th><th align="center"><b>Plays during</b></th><th align="center"><b>What happens</b></th></tr>
  </thead>
  <tbody>
    <tr><td align="right">1</td><td align="left">Fire</td><td align="left">Hero</td><td align="left">The gas flame ignites under an empty kadai.</td></tr>
    <tr><td align="right">2</td><td align="left">Tadka</td><td align="left">Signature dishes (start)</td><td align="left">Ghee pours in, and whole spices fall and sizzle.</td></tr>
    <tr><td align="right">3</td><td align="left">Masala</td><td align="left">Signature dishes (middle)</td><td align="left">Onion and tomato drop in, the gravy turns red, and a ladle stirs.</td></tr>
    <tr><td align="right">4</td><td align="left">Paneer</td><td align="left">Signature dishes → Our Story</td><td align="left">Paneer cubes, a cream swirl and coriander.</td></tr>
    <tr><td align="right">5</td><td align="left">Tandoor</td><td align="left">Menu</td><td align="left">The camera pans to a clay oven. Naan sticks to the wall, blisters, is pulled out and buttered.</td></tr>
    <tr><td align="right">6</td><td align="left">Mithai</td><td align="left">Sweets</td><td align="left">Milk reduces to khoya, ghee drizzles in, laddoos stack on a brass plate, and the silver leaf glints.</td></tr>
    <tr><td align="right">7</td><td align="left">Serve</td><td align="left">Gallery → Contact</td><td align="left">Bowls of paneer, dal and mushroom, plus naan and laddoo, arrive on a steaming brass thali.</td></tr>
  </tbody>
</table>

- **Settings:** `SITE.cooking` in `js/main.js`. Use `enabled: false` to return to the photo slideshow and solid sections. `scrim` sets how strongly the content sections dim the animation; 0 shows it fully and 1 hides it.
- **Cinematic finish:** the 3D world is shot like film. It has an opening crane shot that fades in from black, letterbox bars that open like a curtain, glow around flames and brass with a horizontal lens streak, soft background blur that grows on fly-overs, smooth curved camera moves, a slight handheld sway, a tilt on swoops, light beams, a warm colour grade, a vignette, film grain and a "Chapter V — Tandoor" caption on chapter changes (desktop only). Set `cinematic: false` in `SITE.cooking` to turn it all off, or change `bloom` (default `0.14`) for more or less glow.
- **Preview a moment:** add `?cook=4.5` to the URL to freeze the scene at that point of the story. Values run from 0 to 7.8, one unit per chapter.
- **Performance:** everything is drawn in code, with no video or image downloads. The pixel density is capped and phones get fewer particles. With reduced motion, the scene still follows scrolling, but the flames, steam and embers stop moving.

## What's included

- A preloader with real loading progress. It tracks fonts and the key images, and gives up after 7 seconds at most.
- Lenis smooth scrolling, GSAP ScrollTrigger reveals, split-character headings, clip-path image reveals, parallax, counters, a pinned horizontal gallery on desktop, and native swipe on mobile.
- A transparent navbar that turns to dark glass as you scroll, plus a fullscreen animated mobile menu.
- A custom cursor and magnetic buttons on mouse or trackpad devices only.
- A menu with category tabs, a sliding indicator, keyboard arrow-key support, and data rendered from JavaScript.
- A lightbox with next/previous buttons, keyboard and swipe support, and focus trapping.
- A sticky mobile action bar with Call, Directions and Menu.
- Reduced-motion support. Smooth scrolling, splitting and pinning are turned off and all content shows immediately.
- Fallbacks for every external dependency: fonts, the CDN libraries, images and video.

## Content rules followed

- Nothing on the site is invented: no prices, ingredients, founding year, owner, awards, ratings or testimonials.
- Opening hours stay hidden until confirmed.
- The review section shows only the review count you supplied (224) and a link to the Google listing.

## Browser support

The site works in current Chrome, Edge, Safari, Firefox and Samsung Internet, on desktop and mobile.
