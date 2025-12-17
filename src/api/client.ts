import axios from 'axios'
import { API_BASE } from '../config'
import type { DroneSummary, HealthResponse, Telemetry, RawTelemetry } from './types'
import { normalizeTelemetry } from './types'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
})

export const getHealth = async (): Promise<HealthResponse> => {
  const res = await api.get<HealthResponse>('/api/v1/health')
  return res.data
}

export const getDrones = async (): Promise<DroneSummary[]> => {
  const res = await api.get<DroneSummary[]>('/api/v1/drones')
  return res.data
}

export const getLatestTelemetry = async (droneId: string): Promise<Telemetry> => {
  const res = await api.get<RawTelemetry>(`/api/v1/drones/${droneId}/telemetry/latest`)
  return normalizeTelemetry(res.data)
}

