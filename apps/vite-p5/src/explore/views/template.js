/*
  Clones a <template> from explore/index.html. Markup stays in HTML, where
  Tailwind can see it, and views fill it in through `slot()`.
*/
export function fromTemplate(id) {
  const root = document
    .querySelector(`#${id}`)
    .content.cloneNode(true).firstElementChild
  const slot = (name) => root.querySelector(`[data-slot="${name}"]`)
  return { root, slot }
}
