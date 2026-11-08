const toPattern = (path) =>
  new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}/?$`)

function decodeParams(groups = {}) {
  const entries = Object.entries(groups)
  return Object.fromEntries(
    entries.map(([key, value]) => [key, decodeURIComponent(value)])
  )
}

/*
  A hash router, so deep links work on any static host without rewrite rules.

  A route is `{ path, view }`, where `path` can hold `:name` segments. A view is
  called with `{ outlet, params }`, renders itself into `outlet`, and returns
  `{ title, destroy }`. `fallback` is the view for anything unmatched.
*/
export function createRouter({ routes, fallback, outlet, siteTitle }) {
  const table = routes.map((route) => ({
    ...route,
    pattern: toPattern(route.path),
  }))
  let current = null

  function resolve(path) {
    for (const { pattern, view } of table) {
      const match = path.match(pattern)
      if (!match) continue
      try {
        return { view, params: decodeParams(match.groups) }
      } catch {
        break // A malformed escape, such as #/sketches/%E0
      }
    }
    return { view: fallback, params: {} }
  }

  function render() {
    const isFirstRender = !current
    current?.destroy?.()

    const { view, params } = resolve(location.hash.slice(1) || '/')
    current = view({ outlet, params })
    document.title = `${current.title} · ${siteTitle}`

    window.scrollTo(0, 0)
    // A hash change doesn't move focus the way a page load does.
    if (!isFirstRender) outlet.querySelector('h1')?.focus()
  }

  window.addEventListener('hashchange', render)
  render()
}
