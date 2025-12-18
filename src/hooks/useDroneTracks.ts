import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_DELAY_MS,
  STALE_THRESHOLD_MS,
  WS_BASE,
} from '../config'
import { normalizeTelemetry, type DroneSummary, type RawTelemetry, type Telemetry } from '../api/types'

export type TrackPoint = {
  lat: number
  lon: number
  t: number // unix seconds
}

export type TrackSegment = TrackPoint[]

export type DroneTrackState = {
  [droneId: string]: TrackSegment[]
}

export type DroneMeta = {
  id: string
  status: 'online' | 'stale' | 'offline'
  lastPoint?: TrackPoint
  color: string
}

const makeStreamUrl = (droneId: string) =>
  `${WS_BASE}/api/v1/drones/${droneId}/telemetry/stream`.replace('///', '//')

const SEGMENT_GAP_SECONDS = Math.max(20, STALE_THRESHOLD_MS / 1000)
const MAX_POINTS_PER_DRONE = 800

const palette = [
  '#22c55e',
  '#3b82f6',
  '#a855f7',
  '#ef4444',
  '#f59e0b',
  '#14b8a6',
  '#6366f1',
  '#ec4899',
  '#0ea5e9',
  '#84cc16',
]

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i)
  }
  return hash
}

const colorForDrone = (droneId: string) => {
  const hash = Math.abs(hashString(droneId))
  return palette[hash % palette.length]
}

const trimSegments = (segments: TrackSegment[]) => {
  const cloned = segments.map((segment) => [...segment])
  let totalPoints = cloned.reduce((sum, seg) => sum + seg.length, 0)

  if (totalPoints <= MAX_POINTS_PER_DRONE) return cloned

  while (cloned.length && totalPoints > MAX_POINTS_PER_DRONE) {
    const head = cloned[0]
    const overflow = totalPoints - MAX_POINTS_PER_DRONE

    if (head.length <= overflow) {
      cloned.shift()
      totalPoints -= head.length
    } else {
      cloned[0] = head.slice(overflow)
      totalPoints -= overflow
    }
  }

  return cloned
}

const toTrackPoint = (message: Telemetry, nowSeconds: number): TrackPoint | null => {
  const lat = message.latitude ?? (message as any)?.position?.lat
  const lon = message.longitude ?? (message as any)?.position?.lon

  if (typeof lat !== 'number' || typeof lon !== 'number') return null

  const t = message.timestamp ?? message.received_timestamp ?? nowSeconds
  return { lat, lon, t }
}

const shouldStartNewSegment = (last?: TrackPoint, next?: TrackPoint) => {
  if (!last || !next) return false
  return Math.abs(next.t - last.t) > SEGMENT_GAP_SECONDS
}

const upsertTrack = (
  prev: DroneTrackState,
  droneId: string,
  point: TrackPoint,
): DroneTrackState => {
  const segments = prev[droneId] ?? []
  const latestSegment = segments[segments.length - 1]
  const lastPoint = latestSegment?.[latestSegment.length - 1]

  if (lastPoint && lastPoint.lat === point.lat && lastPoint.lon === point.lon && lastPoint.t === point.t) {
    return prev
  }

  const nextSegments = [...segments]

  if (!latestSegment || latestSegment.length === 0 || shouldStartNewSegment(lastPoint, point)) {
    nextSegments.push([point])
  } else {
    nextSegments[nextSegments.length - 1] = [...latestSegment, point]
  }

  return {
    ...prev,
    [droneId]: trimSegments(nextSegments),
  }
}

const normalizeTelemetryMessage = (payload: unknown): Telemetry | null => {
  if (!payload || typeof payload !== 'object') return null

  const candidate = payload as Telemetry
  if ('latitude' in candidate || 'longitude' in candidate || 'drone_id' in candidate) {
    return candidate
  }

  return normalizeTelemetry(candidate as RawTelemetry)
}

export const useDroneTracks = (drones: DroneSummary[]) => {
  const [tracks, setTracks] = useState<DroneTrackState>({})
  const [lastPoints, setLastPoints] = useState<Record<string, TrackPoint | undefined>>({})

  const socketsRef = useRef<Record<string, WebSocket | null>>({})
  const retriesRef = useRef<Record<string, number>>({})
  const activeIdsRef = useRef<Set<string>>(new Set())

  const connect = useCallback((droneId: string) => {
    const ws = new WebSocket(makeStreamUrl(droneId))
    socketsRef.current[droneId] = ws

    ws.onopen = () => {
      retriesRef.current[droneId] = 0
    }

    ws.onmessage = (event) => {
      const nowSeconds = Date.now() / 1000
      try {
        const parsed = JSON.parse(event.data)
        const telemetry = normalizeTelemetryMessage(parsed)
        if (!telemetry) return

        const id = telemetry.drone_id ?? (parsed as any)?.id ?? droneId
        const trackPoint = toTrackPoint(telemetry, nowSeconds)
        if (!id || !trackPoint) return

        setTracks((prev) => upsertTrack(prev, id, trackPoint))
        setLastPoints((prev) => {
          const current = prev[id]
          if (current && current.lat === trackPoint.lat && current.lon === trackPoint.lon && current.t === trackPoint.t) {
            return prev
          }
          return { ...prev, [id]: trackPoint }
        })
      } catch {
        // Ignore malformed messages for now
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onclose = () => {
      socketsRef.current[droneId] = null
      if (!activeIdsRef.current.has(droneId)) return

      const attempt = (retriesRef.current[droneId] ?? 0) + 1
      retriesRef.current[droneId] = attempt
      const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** (attempt - 1))

      window.setTimeout(() => {
        if (activeIdsRef.current.has(droneId)) {
          connect(droneId)
        }
      }, delay)
    }
  }, [])

  useEffect(() => {
    activeIdsRef.current = new Set(drones.filter((d) => d.status !== 'offline').map((d) => d.id))

    activeIdsRef.current.forEach((id) => {
      const existing = socketsRef.current[id]
      if (existing && existing.readyState !== WebSocket.CLOSED && existing.readyState !== WebSocket.CLOSING) {
        return
      }
      connect(id)
    })

    Object.entries(socketsRef.current).forEach(([id, socket]) => {
      if (!activeIdsRef.current.has(id) && socket) {
        socket.close()
        delete socketsRef.current[id]
        delete retriesRef.current[id]
      }
    })
  }, [connect, drones])

  useEffect(
    () => () => {
      activeIdsRef.current = new Set()
      Object.values(socketsRef.current).forEach((socket) => socket?.close())
    },
    [],
  )

  const metaByDrone = useMemo(() => {
    const ids = new Set<string>([...Object.keys(tracks), ...drones.map((d) => d.id)])
    const next: Record<string, DroneMeta> = {}

    ids.forEach((id) => {
      const summary = drones.find((d) => d.id === id)
      const status = summary?.status === 'online' || summary?.status === 'stale' ? summary.status : 'offline'
      next[id] = {
        id,
        status,
        lastPoint: lastPoints[id],
        color: colorForDrone(id),
      }
    })

    return next
  }, [drones, lastPoints, tracks])

  return { tracks, metaByDrone }
}

