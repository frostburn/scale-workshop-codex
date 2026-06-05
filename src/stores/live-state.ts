type LiveStateRef = { value: unknown }

type LiveStateRefs = Record<string, LiveStateRef>

export type LiveStateValues<T extends LiveStateRefs> = { [K in keyof T]: T[K]['value'] }
export type LiveStatePayload<T extends LiveStateRefs> = Partial<LiveStateValues<T>>

export function serializeLiveState<T extends LiveStateRefs>(liveState: T): LiveStateValues<T> {
  const result = {} as LiveStateValues<T>
  for (const stateKey of Object.keys(liveState) as (keyof T)[]) {
    result[stateKey] = liveState[stateKey].value
  }
  return result
}

export function applyLiveState<T extends LiveStateRefs>(
  liveState: T,
  data: LiveStatePayload<T>
) {
  for (const stateKey of Object.keys(liveState) as (keyof T)[]) {
    const value = data[stateKey]
    if (value !== undefined) {
      liveState[stateKey].value = value
    }
  }
}
