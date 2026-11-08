import blueRed from '../assets/textures/blue-red.webp'
import cloud from '../assets/textures/cloud.webp'
import featherMap from '../assets/textures/feather.webp'
import nostalgia from '../assets/textures/nostalgia.webp'
import ocean from '../assets/textures/ocean.webp'
import stripes from '../assets/textures/stripes.webp'
import thoughts from '../assets/textures/thoughts.webp'
import effectsSource from './effects.js?raw'

export const sourceOf = (name) =>
  effectsSource
    .match(new RegExp(`export function ${name}\\([\\s\\S]*?\\n}`))[0]
    .replace('export ', '')

/*
  The textures a viewer can pick from. Displacement maps aren't listed because
  they're noise, not pictures.
*/
export const textures = [
  { name: 'Nostalgia', url: nostalgia },
  { name: 'Ocean', url: ocean },
  { name: 'Blue and red', url: blueRed },
  { name: 'Stripes', url: stripes },
  { name: 'Thoughts', url: thoughts },
]

/*
  Every smart sketch. Adding an entry here, with its function in effects.js, is
  all it takes to list it on the explore page and give it a route. Keys match
  the data-demo attributes in index.html.
*/
export const sketches = {
  tide: {
    title: 'Tide',
    summary: 'A drifting cloud map pulls the painting side to side.',
    effect: sourceOf('tide'),
    texture: nostalgia,
    map: cloud,
  },
  swell: {
    title: 'Swell',
    summary: 'Sine waves whose frequency wanders with 3D noise.',
    effect: sourceOf('swell'),
    texture: ocean,
  },
  breathe: {
    title: 'Breathe',
    summary: 'A slow zoom with a slight rotation.',
    effect: sourceOf('breathe'),
    texture: blueRed,
  },
  feather: {
    title: 'Feather',
    summary: 'A vein-like noise map bends the shapes.',
    effect: sourceOf('feather'),
    texture: stripes,
    map: featherMap,
  },
  prism: {
    title: 'Prism',
    summary: 'Color channels split apart near your pointer.',
    effect: sourceOf('prism'),
    texture: thoughts,
  },
}
