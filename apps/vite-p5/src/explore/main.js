import { createRouter } from './router.js'
import { galleryView } from './views/gallery.js'
import { notFoundView } from './views/not-found.js'
import { sketchView } from './views/sketch.js'

createRouter({
  outlet: document.querySelector('#outlet'),
  siteTitle: 'Smart Canvas',
  fallback: notFoundView,
  routes: [
    { path: '/', view: galleryView },
    { path: '/sketches/:id', view: sketchView },
  ],
})
