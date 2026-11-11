import { createRoot, hydrateRoot } from 'react-dom/client'

const rootKey = Symbol.for('yingyao.react-root')

// Reuse the root during development updates and hydrate the prerendered homepage once.
export function mountApp(element, { hydrate = false } = {}) {
  const container = document.getElementById('root')
  if (container[rootKey]) container[rootKey].render(element)
  else if (hydrate) container[rootKey] = hydrateRoot(container, element)
  else {
    container[rootKey] = createRoot(container)
    container[rootKey].render(element)
  }
}
