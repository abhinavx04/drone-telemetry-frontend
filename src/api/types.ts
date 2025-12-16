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

