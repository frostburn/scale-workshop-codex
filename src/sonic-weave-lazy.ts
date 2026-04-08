import type * as SonicWeave from 'sonic-weave'

let sonicWeavePromise: Promise<typeof SonicWeave> | undefined

export function loadSonicWeave() {
  if (sonicWeavePromise === undefined) {
    sonicWeavePromise = import('sonic-weave')
  }
  return sonicWeavePromise
}

export async function parseScaleWorkshop2LineLazy(input: string, numberOfComponents: number) {
  const { parseScaleWorkshop2Line } = await loadSonicWeave()
  return parseScaleWorkshop2Line(input, numberOfComponents)
}

export async function setNumberOfComponentsLazy(numberOfComponents: number) {
  const { setNumberOfComponents } = await loadSonicWeave()
  setNumberOfComponents(numberOfComponents)
}
