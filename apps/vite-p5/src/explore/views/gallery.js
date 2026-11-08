import { sketches } from '../../smart-sketches/catalog.js'
import { fromTemplate } from './template.js'

function renderCard(id, sketch) {
  const { root, slot } = fromTemplate('sketch-card')
  slot('link').href = `#/sketches/${id}`
  slot('poster').src = sketch.texture
  slot('title').textContent = sketch.title
  slot('summary').textContent = sketch.summary
  return root
}

export function galleryView({ outlet }) {
  const { root, slot } = fromTemplate('gallery-view')
  slot('cards').append(
    ...Object.entries(sketches).map(([id, sketch]) => renderCard(id, sketch))
  )
  outlet.replaceChildren(root)
  return { title: 'Explore' }
}
