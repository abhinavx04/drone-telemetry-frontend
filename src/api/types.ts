export type DronePosition = {
  lat: number
  lon: number
  alt_m?: number
}

export type DroneSummary = {
  id: string
  status: string
  last_seen_ts: number
  battery_pct: number
  flight_mode: string
  position?: DronePosition
  gps_fix?: boolean
  is_emergency?: boolean
}

export type HealthResponse = {
  status: 'ok' | 'degraded' | 'error' | string
  mqtt_connected?: boolean
  detail?: string
}

// Raw telemetry shape as returned by the backend
export type RawTelemetry = {
  id: string
  status?: string
  last_seen_ts?: number
  source_timestamp?: number
  received_timestamp?: number
  position?: DronePosition
  battery?: {
    pct?: number | null
    voltage_v?: number | null
  }
  flight_mode?: string
  flags?: {
    gps_lost?: boolean | null
    rc_lost?: boolean | null
    is_emergency?: boolean | null
  }
  derived?: {
    ground_speed_mps?: number | null
    climb_rate_mps?: number | null
    heading_deg?: number | null
  }
  version?: number
}

export type Telemetry = {
  drone_id: string
  timestamp?: number // unix seconds
  received_timestamp?: number // unix seconds
  latitude?: number
  longitude?: number
  absolute_altitude_m?: number
  battery_percentage?: number
  flight_mode?: string
  heading_deg?: number
  ground_speed_mps?: number
  climb_rate_mps?: number
  gps_fix?: boolean
  is_emergency?: boolean
  ingest_source?: string
}

// Normalize the backend's raw telemetry into the flattened Telemetry shape
export const normalizeTelemetry = (raw: RawTelemetry): Telemetry => {
  const timestamp = raw.source_timestamp ?? raw.last_seen_ts
  const receivedTimestamp = raw.received_timestamp ?? raw.last_seen_ts

  // gps_lost -> gps_fix: true means GPS OK, false means lost
  let gpsFix: boolean | undefined
  if (raw.flags?.gps_lost === true) gpsFix = false
  else if (raw.flags?.gps_lost === false) gpsFix = true

  return {
    drone_id: raw.id,
    timestamp: timestamp,
    received_timestamp: receivedTimestamp,
    latitude: raw.position?.lat,
    longitude: raw.position?.lon,
    absolute_altitude_m: raw.position?.alt_m,
    battery_percentage: raw.battery?.pct ?? undefined,
    flight_mode: raw.flight_mode,
    heading_deg: raw.derived?.heading_deg ?? undefined,
    ground_speed_mps: raw.derived?.ground_speed_mps ?? undefined,
    climb_rate_mps: raw.derived?.climb_rate_mps ?? undefined,
    gps_fix: gpsFix,
    is_emergency: raw.flags?.is_emergency ?? undefined,
    ingest_source: undefined,
  }
}


