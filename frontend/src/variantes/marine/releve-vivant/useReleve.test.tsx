import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useReleve } from './useReleve'

const reponse = (debut: string) =>
  Response.json({
    creneaux: [{ debut, fin: '2026-11-23T15:30:00+01:00' }],
    recommandations: { durees: { conseille_min: 25, maximum_min: 40 } },
  })

describe('useReleve', () => {
  afterEach(() => vi.restoreAllMocks())

  it('ne rend pas le créneau de l’ancien spot pendant que le nouveau charge', async () => {
    let finir: (r: Response) => void = () => undefined
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(reponse('2026-11-23T13:30:00+01:00'))
      .mockImplementationOnce(() => new Promise<Response>((r) => (finir = r)))

    const { result, rerender } = renderHook(({ spot }) => useReleve(spot), { initialProps: { spot: 1 } })
    await waitFor(() => expect(result.current.creneau?.debut).toBe('2026-11-23T13:30:00+01:00'))

    rerender({ spot: 2 })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2))
    expect(result.current).toEqual({ creneau: null, durees: null })

    finir(reponse('2026-11-23T14:00:00+01:00'))
    await waitFor(() => expect(result.current.creneau?.debut).toBe('2026-11-23T14:00:00+01:00'))
  })
})
