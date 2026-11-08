const MAX_ENTRIES = 200
const LABELS = { info: 'info', success: 'ok', error: 'error' }
const LEVEL_CLASSES = {
  info: 'text-muted',
  success: 'text-emerald-400',
  error: 'text-red-400',
}

const timeOf = (date) => date.toTimeString().slice(0, 8)

/** Appends timestamped lines to `list`, keeping the newest in view. */
export function createLifecycleLog(list) {
  return function log(level, message) {
    const entry = document.createElement('li')
    entry.dataset.level = level
    entry.className = 'grid grid-cols-[auto_3rem_minmax(0,1fr)] gap-x-2 py-0.5'

    const time = document.createElement('time')
    time.className = 'text-muted/70'
    time.textContent = timeOf(new Date())

    const label = document.createElement('span')
    label.className = LEVEL_CLASSES[level]
    label.textContent = LABELS[level]

    const text = document.createElement('span')
    text.className = level === 'error' ? 'text-red-300' : 'text-paper/85'
    text.classList.add('wrap-anywhere')
    text.textContent = message

    entry.append(time, label, text)
    list.append(entry)
    if (list.children.length > MAX_ENTRIES) list.firstElementChild.remove()
    list.scrollTop = list.scrollHeight
  }
}
