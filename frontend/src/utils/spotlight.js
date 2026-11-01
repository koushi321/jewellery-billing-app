// Moves a soft gold light under the mouse. Used with the --mx / --my CSS variables.
export const spotlight = (e) => {
  const el   = e.currentTarget
  const rect = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  el.style.setProperty('--my', `${e.clientY - rect.top}px`)
}
