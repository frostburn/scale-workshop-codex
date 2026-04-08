import type { parseScaleWorkshop2Line } from '../node_modules/sonic-weave/dist/scale-workshop-2-parser.js'
import type { setNumberOfComponents } from '../node_modules/sonic-weave/dist/monzo.js'

let parserPromise:
  | Promise<{
      parseScaleWorkshop2Line: typeof parseScaleWorkshop2Line
    }>
  | undefined

let monzoPromise:
  | Promise<{
      setNumberOfComponents: typeof setNumberOfComponents
    }>
  | undefined

function loadScaleWorkshop2Parser() {
  if (parserPromise === undefined) {
    parserPromise = import('../node_modules/sonic-weave/dist/scale-workshop-2-parser.js')
  }
  return parserPromise
}

function loadMonzoRuntime() {
  if (monzoPromise === undefined) {
    monzoPromise = import('../node_modules/sonic-weave/dist/monzo.js')
  }
  return monzoPromise
}

export async function parseScaleWorkshop2LineLazy(input: string, numberOfComponents: number) {
  const parser = await loadScaleWorkshop2Parser()
  return parser.parseScaleWorkshop2Line(input, numberOfComponents)
}

export async function setNumberOfComponentsLazy(numberOfComponents: number) {
  const monzo = await loadMonzoRuntime()
  monzo.setNumberOfComponents(numberOfComponents)
}
