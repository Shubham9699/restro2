Put the restaurant's own photos in this folder (JPG or WebP, ~1600px wide, under ~400 KB each).

Then open js/main.js and point the matching key in SITE.images at the file, for example:

    paneerSpecial: 'assets/images/badshah-paneer.jpg',
    sweets1:       'assets/images/mithai-counter.jpg',

Every image on the site (hero slideshow, dishes, menu, story, sweets, gallery,
contact background) reads from SITE.images, so changing one line updates it everywhere.
