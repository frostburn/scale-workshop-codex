import { API_URL } from '@/constants'
import { useAudioStore } from '@/stores/audio'
import { useCyclesStore } from '@/stores/edo-cycles'
import { useGridStore } from '@/stores/grid'
import { useJiLatticeStore } from '@/stores/ji-lattice'
import { useScaleStore } from '@/stores/scale'
import { useStateStore } from '@/stores/state'
import { writeScaleIdToHash } from '@/session-hash'
import { makeEnvelope } from '@/utils'

export function useScaleUpload() {
  const state = useStateStore()
  const scale = useScaleStore()
  const audio = useAudioStore()
  const jiLattice = useJiLatticeStore()
  const grid = useGridStore()
  const cycles = useCyclesStore()

  function uploadBody() {
    return JSON.stringify({
      id: scale.id,
      payload: {
        scale: scale.toJSON(),
        audio: audio.toJSON(),
        state: state.toJSON(),
        'ji-lattice': jiLattice.toJSON(),
        grid: grid.toJSON(),
        'edo-cycles': cycles.toJSON()
      },
      envelope: makeEnvelope(state.shareStatistics)
    })
  }

  function uploadScale(retries = 1): Promise<string> {
    const uploadId = scale.id
    if (scale.uploadedId === uploadId) {
      writeScaleIdToHash(uploadId)
      return Promise.resolve(`${window.location.origin}/scale/${uploadId}`)
    }

    return new Promise((resolve) => {
      if (!API_URL) {
        return resolve(window.location.origin)
      }
      fetch(new URL('scale', API_URL), { method: 'POST', body: uploadBody() })
        .then((res) => {
          if (res.status === 409 && retries > 0) {
            scale.rerollId()
            return uploadScale(retries - 1).then(resolve)
          }
          if (res.ok) {
            scale.uploadedId = uploadId
            writeScaleIdToHash(uploadId)
            return resolve(`${window.location.origin}/scale/${uploadId}`)
          }
          return resolve(window.location.origin)
        })
        .catch(() => resolve(window.location.origin))
    })
  }

  return {
    uploadScale,
    uploadBody
  }
}
