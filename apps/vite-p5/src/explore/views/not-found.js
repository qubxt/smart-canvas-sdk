import { fromTemplate } from './template.js'

export function notFoundView({ outlet }) {
  outlet.replaceChildren(fromTemplate('not-found-view').root)
  return { title: 'Not found' }
}
