import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  HISTORY_POINTS,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  STALE_THRESHOLD_MS,
  WS_BASE,
} from '../config'
import { getLatestTelemetry } from '../api/client'
import type { Telemetry, RawTelemetry } from '../api/types'
import { normalizeTelemetry } from '../api/types'

type StreamState = 'idle' | 'connecting' | 'open' | 'closed'

type TelemetryHistoryPoint = {
  t: number
  altitude?: number
  battery?: number
}

type UseLiveTelemetryResult = {
  telemetry?: Telemetry
  history: TelemetryHistoryPoint[]
  streamState: StreamState
  wsError?: string | null
  lastUpdateMs?: number
  isStale: boolean
}

const makeStreamUrl = (droneId: string) =>
  `${WS_BASE}/api/v1/drones/${droneId}/telemetry/stream`.replace('///', '//')

export const useLiveTelemetry = (
  droneId: string | null,
  currentTimeMs: number,
): UseLiveTelemetryResult => {
  const [streamState, setStreamState] = useState<StreamState>('idle')
  const [wsError, setWsError] = useState<string | null>(null)
  const [latestByDrone, setLatestByDrone] = useState<Record<string, Telemetry | undefined>>({})
  const [historyByDrone, setHistoryByDrone] = useState<Record<string, TelemetryHistoryPoint[]>>({})
  const retryCountRef = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const nowRef = useRef(currentTimeMs)

  useEffect(() => {
    nowRef.current = currentTimeMs
  }, [currentTimeMs])

  const latestQuery = useQuery({
    queryKey: ['telemetry-latest', droneId],
    queryFn: () => getLatestTelemetry(droneId!),
    enabled: Boolean(droneId),
    refetchInterval: streamState === 'open' ? false : 5000,
    refetchOnWindowFocus: false,
  })

  // WebSocket subscription
  useEffect(() => {
    if (!droneId) return

    let cancelled = false

    const connect = () => {
      setStreamState('connecting')
      const ws = new WebSocket(makeStreamUrl(droneId))
      wsRef.current = ws

      ws.onopen = () => {
        retryCountRef.current = 0
        setStreamState('open')
        setWsError(null)
      }

      ws.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data) as RawTelemetry
          const message = normalizeTelemetry(raw)
          setLatestByDrone((prev) => ({ ...prev, [droneId]: message }))
          setHistoryByDrone((prev) => {
            const current = prev[droneId] ?? []
            const point: TelemetryHistoryPoint = {
              t: (message.timestamp ?? message.received_timestamp ?? nowRef.current / 1000) * 1000,
              altitude: message.absolute_altitude_m,
              battery: message.battery_percentage,
            }
            const next = [...current, point].slice(-HISTORY_POINTS)
            return { ...prev, [droneId]: next }
          })
        } catch {
          setWsError('Unable to parse telemetry message')
        }
      }

      ws.onerror = () => {
        setWsError('WebSocket error')
      }

      ws.onclose = () => {
        setStreamState('closed')
        if (cancelled) return
        retryCountRef.current += 1
        const delay = Math.min(
          RECONNECT_MAX_DELAY_MS,
          RECONNECT_BASE_DELAY_MS * 2 ** (retryCountRef.current - 1),
        )
        setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      wsRef.current?.close()
    }
  }, [droneId])

  const latest = droneId ? latestByDrone[droneId] : undefined
  const history = useMemo(
    () => (droneId ? historyByDrone[droneId] ?? [] : []),
    [droneId, historyByDrone],
  )

  const telemetry = latest ?? latestQuery.data

  const lastUpdateMs = useMemo(() => {
    if (telemetry?.timestamp) return telemetry.timestamp * 1000
    if (telemetry?.received_timestamp) return telemetry.received_timestamp * 1000
    return undefined
  }, [telemetry?.received_timestamp, telemetry?.timestamp])

  const seededHistory = useMemo(() => {
    if (history.length) return history
    if (latestQuery.data) {
      return [
        {
          t: (latestQuery.data.timestamp ?? latestQuery.data.received_timestamp ?? 0) * 1000,
          altitude: latestQuery.data.absolute_altitude_m,
          battery: latestQuery.data.battery_percentage,
        },
      ]
    }
    return []
  }, [history, latestQuery.data])

  const isStale =
    typeof lastUpdateMs === 'number' ? currentTimeMs - lastUpdateMs > STALE_THRESHOLD_MS : true

  return {
    telemetry,
    history: seededHistory,
    streamState,
    wsError,
    lastUpdateMs,
    isStale,
  }
}

