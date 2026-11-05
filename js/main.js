/* =========================================================
   SHREYA SWEETS & RESTAURANTS — main.js
   Central site data + rendering + preloader.
   ---------------------------------------------------------
   EDIT EVERYTHING ABOUT THE RESTAURANT IN THE `SITE` OBJECT.
   ========================================================= */

(function () {
  'use strict';

  /* All photos live in assets/images/ */
  const IMG = 'assets/images/';

  const SITE = {
    name: 'Shreya Sweets & Restaurants',
    phone: '+91 98392 26260',
    tel: '+919839226260',
    address: 'Rajpura Bypass Road, In Front of Bharat Petroleum, Bhadohi, Uttar Pradesh 221401',
    googleListing: 'https://www.google.com/search?q=shreya+sweets+and+restaurant+bhadohi+nagar+palika',

    /* Google review count. Update this number when it changes. */
    reviewCount: 224,

    /* Paste a verified Google Maps embed URL here (Share → Embed a map → copy the src="...").
       Leave empty to show the stylised "Open in Google Maps" card instead. */
    mapEmbedUrl: '',

    /* Confirmed opening hours only. Example:
       hours: [{ days: 'Monday – Sunday', time: '10:00 AM – 10:30 PM' }]
       Leave empty to show "Please call us to confirm today's timings." */
    hours: [],

    /* Genuine Google reviews only — copy exact text with the reviewer's first name.
       Example: { name: 'Rahul', text: '...', source: 'Google' }
       Leave empty to hide the review list. */
    reviews: [],

    /* ---------- SCROLL-DRIVEN COOKING BACKGROUND (js/cooking.js) ----------
       enabled: false  → back to the photo slideshow / video hero and solid sections.
       scrim: how dark the content sections are over the animation (0 = fully visible, 1 = hidden).
       mode: '3d' (Three.js world, js/cooking3d.js) or '2d' (lighter canvas version, js/cooking.js).
       If WebGL isn't available, the 2D version is used automatically.
       cinematic: film finish on the 3D world (glow, lens blur, grain, letterbox, opening crane shot).
         Set false for a plainer, lighter render. bloom: glow strength (default 0.14). */
    cooking: { enabled: true, mode: '3d', scrim: 0.5, cinematic: true, bloom: 0.14 },

    /* ---------- HERO VIDEO ----------
       Drop a file in assets/videos/ and list it here. If the video is missing,
       blocked, or the visitor is on data-saver, the cinematic photo slideshow plays instead. */
    hero: {
      videos: [
        { src: 'assets/videos/hero.webm', type: 'video/webm' },
        { src: 'assets/videos/hero.mp4', type: 'video/mp4' }
      ],
      playOnMobile: true,
      slides: ['hero1', 'hero2', 'hero3', 'hero4']
    },

    /* ---------- IMAGES ----------
       One place for every photo on the site. To use your own photos, put them in
       assets/images/ and change a value, e.g.  paneer: 'assets/images/paneer.jpg'  */
    images: {
      hero1: IMG + 'tandoor-naan.jpg',
      hero2: IMG + 'badsah-paneer.jpg',
      hero3: IMG + 'mithai-display.jpg',
      hero4: IMG + 'dal-naan.jpg',

      paneerSpecial: IMG + 'badsah-paneer.jpg',
      dalMakhani: IMG + 'dal-makhani.jpg',
      paneerButter: IMG + 'changezi-paneer.jpg',
      paneerButterMasala: IMG + 'paneer-butter-masala.jpg',
      soyaChap: IMG + 'paneer-tikka.jpg',
      mushroom: IMG + 'mushroom-bahar.jpg',
      mushroomHandi: IMG + 'mushroom-handi.jpg',
      tandooriBahar: IMG + 'thali.jpg',
      butterNaan: IMG + 'butter-naan.jpg',
      kashmiriNaan: IMG + 'kashmiri-naan.jpg',
      naanBaking: IMG + 'naan-baking.jpg',
      tandoor: IMG + 'tandoor-naan.jpg',
      dalNaan: IMG + 'dal-naan.jpg',

      spread: IMG + 'thali.jpg',
      ambience1: IMG + 'interior-2.jpg',
      ambience2: IMG + 'interior-1.jpg',

      sweets1: IMG + 'mithai-display.jpg',
      sweets2: IMG + 'burfi-peda.jpg',
      sweets3: IMG + 'laddoo.jpg',
      mithaiFestive: IMG + 'mithai-festive.jpg',
      gulabJamun: IMG + 'gulab-jamun.jpg',
      rasgulla: IMG + 'rasgulla.jpg',

      breads: IMG + 'naan-baking.jpg',
      spices: IMG + 'spices.jpg',
      contactBg: IMG + 'interior-2.jpg'
    },

    /* Credits for the openly licensed stand-in photos (Wikimedia Commons).
       Their licences require attribution — they're listed in the footer.
       Remove a row when you replace that photo with your own; when the list
       is empty the credits link disappears. [file, title, author, licence, commons file] */
    photoCredits: [
      ['badsah-paneer', 'Kadai Paneer', 'Yummy O Yummy', 'CC BY 2.0', 'Kadai_Paneer_(15913018051).jpg'],
      ['dal-makhani', 'Dal Makhani', 'Marajozkee', 'CC BY-SA 4.0', 'Dal_Makhani_01.jpg'],
      ['changezi-paneer', 'Butter Naan with Paneer Butter Masala', 'K.Sreeram Wiki', 'CC0', 'Butter_Naan_With_Paneer_Butter_Masala.jpg'],
      ['paneer-butter-masala', 'Paneer butter masala', 'Gannu03', 'CC BY-SA 4.0', 'Paneer_butter_masala_3.jpg'],
      ['paneer-tikka', 'Paneer tikka', 'Srikoundinya66', 'CC BY-SA 4.0', 'Paneer_tikka_1.jpg'],
      ['mushroom-bahar', 'Mushroom Butter Masala', 'Yummy O Yummy', 'CC BY 2.0', 'Mushroom_Butter_Masala_(15914329462).jpg'],
      ['mushroom-handi', 'Mushroom Masala', 'Dr. Raju Kasambe', 'CC BY-SA 4.0', 'Mushroom_Masala_by_Dr._Raju_Kasambe_IMG_20190701_(7).jpg'],
      ['kashmiri-naan', 'Naan', 'Shisma', 'CC BY 4.0', 'Naan_2.jpg'],
      ['butter-naan', 'Butter Naan', 'Ganesh Mohan T', 'CC BY-SA 4.0', 'Butter_Naan_2.jpg'],
      ['laddoo', 'Motichoor Laddoo', 'ABHINAVKUMARSAHAI', 'CC BY-SA 4.0', 'MotichurLaddooGhee.jpg'],
      ['burfi-peda', 'Burfi and Peda', 'Melanie M', 'CC BY 2.0', 'Burfi_and_Peda,_Indian_Sweets_Mithai_Chennai_India.jpg'],
      ['mithai-festive', 'Sweets for festivals', 'Laura', 'CC BY-SA 2.0', 'Sweets_Mithai_for_Diwali_and_other_Festivals_of_India.jpg'],
      ['mithai-display', 'Display of Indian sweets', 'Dipanker Dutta', 'CC BY 2.0', 'Display_of_Indian_Sweets_Mithai_in_Kolkata,_West_Bengal.jpg'],
      ['gulab-jamun', 'Two Gulab Jamun', 'Suyash.dwivedi', 'CC BY-SA 4.0', 'Two_Gulab_Jamun_in_a_plate_01.jpg'],
      ['rasgulla', 'Rasgulla with Rabdi', 'Prakrutim', 'CC BY-SA 4.0', 'Rasgulla_With_Rabdi.jpg'],
      ['interior-1', 'Restaurant interior', 'Infrogmation of New Orleans', 'CC BY-SA 3.0', 'BocaAug08CurryRestaurantInterior.jpg'],
      ['interior-2', 'Restaurant dining hall', 'Rameshng', 'CC BY-SA 3.0', 'Paradise_restaurant_Hyderabad_3986.JPG'],
      ['tandoor-naan', 'Naan inside tandoor', 'Ravi Dwivedi', 'CC BY-SA 4.0', 'Naan_Flatbread_inside_Tandoor_01.jpg'],
      ['naan-baking', 'Naan baked in tandoor', 'Ravi Dwivedi', 'CC BY-SA 4.0', 'Naan_baked_in_Tandoor.jpg'],
      ['thali', 'North Indian vegetarian thali', 'Rajeeb Dutta', 'CC BY-SA 4.0', 'North_Indian_Vegetarian_Thali-MB51.jpg'],
      ['spices', 'Indian spices', 'Ajay Suresh', 'CC BY 2.0', 'Indian_Spices_(49696133942).jpg'],
      ['dal-naan', 'Dal Makhani with Naan', 'Barry Pousman', 'CC BY 2.0', 'Dal_Makhani_along_with_Naan.jpg']
    ],

    /* ---------- SIGNATURE SHOWCASE ---------- */
    signature: [
      { name: 'Badshah Paneer Special', tag: 'Paneer Special', img: 'paneerSpecial',
        text: 'A regal paneer special with a name to match — a centrepiece for the whole table.' },
      { name: 'Dal Makhani', tag: 'Dal & Main Course', img: 'dalMakhani',
        text: 'The comforting heart of a North Indian meal, made for sharing with warm bread.' },
      { name: 'Changezi Paneer Butter Masala', tag: 'Paneer Special', img: 'paneerButter',
        text: 'Our grand take on a beloved paneer classic — indulgent, generous and best with butter naan.' },
      { name: 'Tandoori Soya Chap Tikka', tag: 'From the Tandoor', img: 'soyaChap',
        text: 'Soya chap given the full tandoori treatment, straight from the heat to your plate.' },
      { name: 'Mushroom Bahar', tag: 'Mushroom Special', img: 'mushroom',
        text: 'A celebration of mushroom — one of many mushroom specialities waiting on our menu.' },
      { name: 'Shreya Tandoori Bahar', tag: 'House Special', img: 'tandooriBahar',
        text: 'The house special that carries our name — from our tandoor to your table.' },
      { name: 'Butter Naan', tag: 'Indian Breads', img: 'butterNaan',
        text: 'Soft, golden and finished with butter — the bread that completes every gravy.' }
    ],

    /* ---------- MENU ----------
       Add `price: '₹180'` to any item once prices are confirmed. Items without a
       price show "Ask for Price". `img` (optional) is a key from `images` above. */
    menu: [
      {
        id: 'paneer', title: 'Paneer & Mushroom Specials', img: 'paneerSpecial',
        items: [
          { name: 'Badshah Paneer Special', img: 'paneerSpecial', star: true },
          { name: 'Changezi Paneer Butter Masala', img: 'paneerButter', star: true },
          { name: 'Mushroom Bahar', img: 'mushroom', star: true },
          { name: 'Mushroom Masala' },
          { name: 'Mushroom Curry' },
          { name: 'Mushroom Do Pyaja' },
          { name: 'Mushroom Handi' },
          { name: 'Mushroom Paneer' },
          { name: 'Mushroom Kadhai' },
          { name: 'Mushroom Matar' },
          { name: 'Mushroom Tawa Masala' },
          { name: 'Shreya Tandoori Bahar', img: 'tandooriBahar', star: true }
        ]
      },
      {
        id: 'dal', title: 'Dal & Main Course', img: 'dalMakhani',
        items: [
          { name: 'Dal Makhani', img: 'dalMakhani', star: true }
        ]
      },
      {
        id: 'breads', title: 'Indian Breads', img: 'breads',
        items: [
          { name: 'Tandoori Roti' },
          { name: 'Butter Roti' },
          { name: 'Mixi Roti' },
          { name: 'Butter Naan', img: 'butterNaan', star: true },
          { name: 'Plain Naan' },
          { name: 'Stuff Naan' },
          { name: 'Garlic Naan' },
          { name: 'Butter Kulcha' },
          { name: 'Lachha Paratha' },
          { name: 'Aloo Paratha' },
          { name: 'Gobhi Paratha' },
          { name: 'Onion Paratha' },
          { name: 'Stuff Paratha' },
          { name: 'Paneer Paratha' },
          { name: 'Paneer Kulcha' },
          { name: 'Shreya Special Kashmiri Naan', star: true }
        ]
      },
      {
        id: 'sweets', title: 'Sweets', img: 'sweets1',
        items: [
          { name: 'Desi Ghee and Khoya Mix Sweets', img: 'sweets1', star: true }
        ]
      }
    ],

    /* ---------- GALLERY ---------- (keys from `images`, h = tall/short tile) */
    gallery: [
      { img: 'tandoor', caption: 'Naan in the tandoor', h: 'tall' },
      { img: 'paneerButterMasala', caption: 'Paneer gravy', h: 'tall' },
      { img: 'mithaiFestive', caption: 'Shelves of mithai', h: 'short' },
      { img: 'spread', caption: 'A vegetarian thali', h: 'tall' },
      { img: 'ambience1', caption: 'Family dining', h: 'short' },
      { img: 'mushroomHandi', caption: 'Mushroom masala', h: 'short' },
      { img: 'sweets3', caption: 'Ghee laddoo', h: 'tall' },
      { img: 'dalNaan', caption: 'Dal with naan', h: 'short' },
      { img: 'naanBaking', caption: 'Breads fresh from the tandoor', h: 'short' },
      { img: 'gulabJamun', caption: 'Gulab jamun', h: 'tall' },
      { img: 'spices', caption: 'The spice box', h: 'short' },
      { img: 'sweets2', caption: 'Burfi & peda', h: 'short' },
      { img: 'kashmiriNaan', caption: 'Soft naan', h: 'tall' },
      { img: 'rasgulla', caption: 'Rasgulla', h: 'short' },
      { img: 'ambience2', caption: 'Dining room', h: 'short' }
    ],

    marquee: ['Badshah Paneer Special', 'Dal Makhani', 'Butter Naan', 'Tandoori Soya Chap Tikka',
      'Mushroom Bahar', 'Kashmiri Naan', 'Desi Ghee Sweets', 'Shreya Tandoori Bahar']
  };

  window.SITE = SITE;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (str) => String(str).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const imgSrc = (key) => SITE.images[key] || '';
  const PLACEHOLDER = 'assets/icons/placeholder.svg';

  /* ---------- Broken image fallback (capture phase catches all <img> errors) ---------- */
  document.addEventListener('error', (e) => {
    const el = e.target;
    if (el && el.tagName === 'IMG' && !el.dataset.fallback) {
      el.dataset.fallback = '1';
      el.classList.add('is-fallback');
      el.src = PLACEHOLDER;
    }
  }, true);

  /* ---------- Render: marquee ---------- */
  function renderMarquee() {
    const track = $('#marqueeTrack');
    if (!track) return;
    const row = SITE.marquee.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
    track.innerHTML = `<div class="marquee__group">${row}</div><div class="marquee__group">${row}</div>`;
  }

  /* ---------- Render: signature dishes ---------- */
  function renderDishes() {
    const list = $('#dishList');
    if (!list) return;
    list.innerHTML = SITE.signature.map((d, i) => `
      <article class="dish ${i % 2 ? 'dish--alt' : ''}">
        <figure class="dish__media clip-reveal" data-cursor="view">
          <img data-img="${esc(d.img)}" alt="${esc(d.name)}" loading="lazy" decoding="async" />
        </figure>
        <div class="dish__body">
          <span class="dish__index" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <p class="dish__tag" data-reveal>${esc(d.tag)}</p>
          <h3 class="dish__name" data-split>${esc(d.name)}</h3>
          <p class="dish__text" data-reveal>${esc(d.text)}</p>
          <a href="#menu" class="link-underline" data-reveal data-menu-jump="${i === 1 ? 'dal' : i === 6 ? 'breads' : 'paneer'}">See it on the menu</a>
        </div>
      </article>`).join('');
  }

  /* ---------- Render: menu ---------- */
  function renderMenu() {
    const tabs = $('#menuTabs');
    const panel = $('#menuPanel');
    if (!tabs || !panel) return;

    const cats = [{ id: 'all', title: 'All' }].concat(SITE.menu);
    tabs.insertAdjacentHTML('beforeend', cats.map((c, i) => `
      <button class="menu-tab ${i === 0 ? 'is-active' : ''}" role="tab" id="tab-${c.id}"
        aria-selected="${i === 0}" aria-controls="menuPanel" data-cat="${c.id}" tabindex="${i === 0 ? 0 : -1}">
        ${esc(c.title)}
        ${c.items ? `<span class="menu-tab__count">${c.items.length}</span>` : ''}
      </button>`).join(''));

    panel.innerHTML = SITE.menu.map((cat) => `
      <div class="menu-group" data-group="${cat.id}">
        <div class="menu-group__aside">
          <figure class="menu-group__img">
            <img data-img="${esc(cat.img)}" alt="${esc(cat.title)}" loading="lazy" decoding="async" />
          </figure>
          <h3 class="menu-group__title">${esc(cat.title)}</h3>
          <p class="menu-group__count">${cat.items.length} ${cat.items.length === 1 ? 'item' : 'items'}</p>
        </div>
        <ul class="menu-grid">
          ${cat.items.map((it, i) => `
            <li class="menu-card ${it.img ? 'menu-card--photo' : ''}">
              ${it.img ? `<figure class="menu-card__img"><img data-img="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy" decoding="async" /></figure>` : ''}
              <div class="menu-card__body">
                <span class="menu-card__num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
                <h4 class="menu-card__name">${esc(it.name)}</h4>
                ${it.star ? '<span class="menu-card__star">Signature</span>' : ''}
                <div class="menu-card__foot">
                  ${it.price
                    ? `<span class="menu-card__price">${esc(it.price)}</span>`
                    : `<a class="menu-card__ask" href="tel:${SITE.tel}" aria-label="Call to ask the price of ${esc(it.name)}">Ask for Price</a>`}
                </div>
              </div>
            </li>`).join('')}
        </ul>
      </div>`).join('');

    const total = SITE.menu.reduce((n, c) => n + c.items.length, 0);
    const mc = $('#menuCount');
    if (mc) { mc.textContent = total; mc.dataset.count = total; }
  }

  /* ---------- Render: gallery (masonry columns of 2 or 1 tiles) ---------- */
  function renderGallery() {
    const track = $('#galleryTrack');
    if (!track) return;
    const cols = [];
    let i = 0;
    while (i < SITE.gallery.length) {
      const a = SITE.gallery[i];
      if (a.h === 'tall' && i % 3 === 0) { cols.push([i]); i += 1; }
      else { cols.push(SITE.gallery[i + 1] ? [i, i + 1] : [i]); i += 2; }
    }
    track.innerHTML = cols.map((c) => `
      <div class="gallery__col ${c.length === 1 ? 'gallery__col--single' : ''}">
        ${c.map((idx) => {
          const g = SITE.gallery[idx];
          return `<button class="gallery__item gallery__item--${g.h}" data-index="${idx}" data-cursor="view"
              aria-label="Open image: ${esc(g.caption)}">
            <img data-img="${esc(g.img)}" alt="${esc(g.caption)}" loading="lazy" decoding="async" />
            <span class="gallery__caption">${esc(g.caption)}</span>
          </button>`;
        }).join('')}
      </div>`).join('');
  }

  /* ---------- Render: hero slides ---------- */
  function renderHeroSlides() {
    const wrap = $('#heroSlides');
    if (!wrap) return;
    wrap.innerHTML = SITE.hero.slides.map((k, i) =>
      `<div class="hero__slide ${i === 0 ? 'is-active' : ''}"><img data-img="${k}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" /></div>`
    ).join('');
  }

  /* ---------- Render: reviews / hours / map ---------- */
  function renderDynamicInfo() {
    $$('[data-site="reviewCount"]').forEach((el) => {
      el.textContent = SITE.reviewCount;
      el.dataset.count = SITE.reviewCount;
    });

    const list = $('#reviewList');
    if (list && SITE.reviews.length) {
      list.hidden = false;
      list.innerHTML = SITE.reviews.map((r) => `
        <blockquote class="review" data-reveal>
          <p>“${esc(r.text)}”</p>
          <footer>— ${esc(r.name)}${r.source ? ` · <span>${esc(r.source)}</span>` : ''}</footer>
        </blockquote>`).join('');
    }

    const hours = $('#hoursText');
    if (hours && SITE.hours.length) {
      hours.innerHTML = SITE.hours.map((h) => `<span class="hours-row"><b>${esc(h.days)}</b> ${esc(h.time)}</span>`).join('');
    }

    if (SITE.mapEmbedUrl) {
      const box = $('#mapBox');
      box.innerHTML = `<iframe src="${esc(SITE.mapEmbedUrl)}" title="Map showing ${esc(SITE.name)}"
        loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    }
  }

  /* ---------- Photo credits (footer) ---------- */
  function renderCredits() {
    const box = $('#credits');
    if (!box) return;
    if (!SITE.photoCredits.length) { box.remove(); return; }
    $('#creditsList').innerHTML = SITE.photoCredits.map(([, title, author, lic, file]) =>
      `<li><a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}" target="_blank" rel="noopener">${esc(title)}</a> — ${esc(author)}, ${esc(lic)}</li>`
    ).join('');
  }

  /* ---------- Links ---------- */
  function wireLinks() {
    const dest = encodeURIComponent(`${SITE.name}, ${SITE.address}`);
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;
    $$('[data-directions]').forEach((a) => { a.href = directions; });
    $$('[data-tel]').forEach((a) => { a.href = `tel:${SITE.tel}`; });
    $$('[data-google]').forEach((a) => { a.href = SITE.googleListing; });
    const g = $('#googleListingBtn');
    if (g) g.href = SITE.googleListing;
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Apply images from the central map ---------- */
  function applyImages(root = document) {
    $$('img[data-img]', root).forEach((img) => {
      const src = imgSrc(img.dataset.img);
      if (src && img.getAttribute('src') !== src) img.src = src;
      else if (!src) img.src = PLACEHOLDER;
    });
  }

  /* ---------- Preloader with real progress ----------
     Tracks: web fonts + hero slide images + first visible images. */
  function runPreloader() {
    const bar = $('#preloaderBar');
    const count = $('#preloaderCount');
    const pre = $('#preloader');

    const critical = [SITE.hero.slides[0], SITE.hero.slides[1], 'ambience1', 'spread', 'paneerSpecial']
      .map(imgSrc).filter(Boolean);

    const tasks = critical.map((src) => new Promise((res) => {
      const im = new Image();
      im.onload = im.onerror = res;
      im.src = src;
    }));
    if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready.catch(() => {}));

    const total = tasks.length;
    let done = 0;
    let shown = 0;
    let target = 0;
    let finished = false;

    const tick = () => {
      shown += (target - shown) * 0.12;
      if (target - shown < 0.4) shown = target;
      const v = Math.round(shown);
      if (count) count.textContent = v;
      if (bar) bar.style.transform = `scaleX(${v / 100})`;
      if (v >= 100 && finished) return complete();
      requestAnimationFrame(tick);
    };

    tasks.forEach((p) => p.then(() => {
      done += 1;
      target = Math.min(100, Math.round((done / total) * 100));
      if (done === total) finished = true;
    }));

    // Safety: never block visitors for more than 7 seconds on slow networks.
    // rAF can be paused (background tab / headless), so the timeout also completes directly.
    setTimeout(() => {
      target = 100; finished = true;
      if (count) count.textContent = 100;
      if (bar) bar.style.transform = 'scaleX(1)';
      setTimeout(complete, 400);
    }, 7000);

    let completed = false;
    function complete() {
      if (completed) return;
      completed = true;
      document.body.classList.remove('is-loading');
      pre.classList.add('is-done');
      window.__siteReady = true;
      document.dispatchEvent(new CustomEvent('site:ready'));
      setTimeout(() => pre.remove(), 1400);
    }

    requestAnimationFrame(tick);
  }

  /* ---------- Boot ---------- */
  renderMarquee();
  renderHeroSlides();
  renderDishes();
  renderMenu();
  renderGallery();
  renderDynamicInfo();
  renderCredits();
  wireLinks();
  applyImages();
  document.dispatchEvent(new CustomEvent('site:rendered'));
  runPreloader();
})();
