import { useMemo } from 'react'
import { Alert, Box, Stack, Typography } from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import SpeedIcon from '@mui/icons-material/Speed'
import HeightIcon from '@mui/icons-material/Height'
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull'
import ExploreIcon from '@mui/icons-material/Explore'
import FlightIcon from '@mui/icons-material/Flight'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import GpsOffIcon from '@mui/icons-material/GpsOff'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { DroneSummary, Telemetry } from '../api/types'
import Sparkline from './Sparkline'

dayjs.extend(relativeTime)

type HistoryPoint = { t: number; altitude?: number; battery?: number }

type Props = {
  summary?: DroneSummary
  telemetry?: Telemetry
  history: HistoryPoint[]
  streamState: 'idle' | 'connecting' | 'open' | 'closed'
  wsError?: string | null
  lastUpdateMs?: number
  isStale: boolean
  currentTimeMs: number
}

type StatProps = {
  icon: React.ReactNode
  label: string
  value: string | number | undefined
  unit?: string
  accent?: string
}

const Stat = ({ icon, label, value, unit, accent }: StatProps) => (
  <Box className="stat-card">
    <Box className="stat-label">
      <Box sx={{ color: accent || 'var(--text-muted)', display: 'flex' }}>{icon}</Box>
      {label}
    </Box>
    <Typography className="stat-value">
      {value ?? '—'}
      {value != null && unit && <span className="stat-unit">{unit}</span>}
    </Typography>
  </Box>
)

// Helper function to safely get numeric value (handles null, undefined, and 0 properly)
const getNumericValue = (value: number | null | undefined): number | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'number' && !isNaN(value)) return value
  return undefined
}

const DroneDetailPanel = ({
  summary,
  telemetry,
  history,
  streamState,
  wsError,
  lastUpdateMs,
  isStale,
  currentTimeMs,
}: Props) => {
  // Fixed: Properly handle null values and 0 - check if value exists and is a number
  const heading = getNumericValue(telemetry?.heading_deg)
  const groundSpeed = getNumericValue(telemetry?.ground_speed_mps)
  const climb = getNumericValue(telemetry?.climb_rate_mps)
  
  // Fixed: Check if telemetry value exists (including 0), only fall back to summary if null/undefined
  const altitude = telemetry?.absolute_altitude_m != null 
    ? telemetry.absolute_altitude_m 
    : summary?.position?.alt_m
  const battery = telemetry?.battery_percentage != null 
    ? telemetry.battery_percentage 
    : summary?.battery_pct
  const mode = telemetry?.flight_mode ?? summary?.flight_mode
  const gps = telemetry?.gps_fix ?? summary?.gps_fix
  const emergency = telemetry?.is_emergency ?? summary?.is_emergency

  const lastSeenText = useMemo(() => {
    if (!lastUpdateMs) return '—'
    return dayjs(lastUpdateMs).from(currentTimeMs)
  }, [currentTimeMs, lastUpdateMs])

  const streamIcon = streamState === 'open' ? (
    <WifiIcon sx={{ fontSize: 14 }} />
  ) : (
    <WifiOffIcon sx={{ fontSize: 14 }} />
  )

  // Debug panel data - show all received telemetry fields
  const debugData = useMemo(() => {
    if (!telemetry) return null
    return {
      'drone_id': telemetry.drone_id,
      'timestamp': telemetry.timestamp != null ? new Date(telemetry.timestamp * 1000).toISOString() : null,
      'received_timestamp': telemetry.received_timestamp != null ? new Date(telemetry.received_timestamp * 1000).toISOString() : null,
      'latitude': telemetry.latitude,
      'longitude': telemetry.longitude,
      'absolute_altitude_m': telemetry.absolute_altitude_m,
      'battery_percentage': telemetry.battery_percentage,
      'flight_mode': telemetry.flight_mode,
      'heading_deg': telemetry.heading_deg,
      'ground_speed_mps': telemetry.ground_speed_mps,
      'climb_rate_mps': telemetry.climb_rate_mps,
      'gps_fix': telemetry.gps_fix,
      'is_emergency': telemetry.is_emergency,
      'ingest_source': telemetry.ingest_source,
    }
  }, [telemetry])

  return (
    <Box className="card">
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2.5}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
              }}
            >
              {summary?.id ?? 'Select a drone'}
            </Typography>
            
            {/* Status badges */}
            {summary?.status && (
              <Box
                className={`status-badge ${isStale ? 'status-stale' : 'status-online'}`}
              >
                {isStale ? 'STALE' : summary.status.toUpperCase()}
              </Box>
            )}

            {emergency && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                <WarningAmberIcon sx={{ fontSize: 14, color: 'var(--accent-red)' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-red)' }}>
                  EMERGENCY
                </Typography>
              </Box>
            )}
          </Stack>

          <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Live telemetry with auto-reconnect
          </Typography>
        </Box>

        {/* Connection & GPS status */}
        <Stack direction="row" spacing={1}>
          {/* Stream status */}
          <Box
            className={`connection-chip ${streamState === 'open' ? 'connected' : ''}`}
          >
            {streamIcon}
            <span>{streamState === 'open' ? 'Connected' : streamState}</span>
          </Box>

          {/* GPS status */}
          {gps != null && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 'var(--radius-sm)',
                bgcolor: gps ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: '1px solid',
                borderColor: gps ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
              }}
            >
              {gps ? (
                <GpsFixedIcon sx={{ fontSize: 14, color: 'var(--accent-green)' }} />
              ) : (
                <GpsOffIcon sx={{ fontSize: 14, color: 'var(--accent-yellow)' }} />
              )}
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: gps ? 'var(--accent-green)' : 'var(--accent-yellow)',
                }}
              >
                {gps ? 'GPS OK' : 'NO GPS'}
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>

      {wsError && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            borderRadius: 'var(--radius-md)',
            bgcolor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          {wsError}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Flight Data Section */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              borderRadius: 'var(--radius-md)',
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              height: '100%',
            }}
          >
            <Box className="section-header" sx={{ mb: 2 }}>
              <Typography className="section-title">Flight Data</Typography>
              <Box className="section-line" />
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={6}>
                <Stat
                  icon={<FlightIcon sx={{ fontSize: 16 }} />}
                  label="Mode"
                  value={mode ?? '—'}
                  accent="var(--accent-blue)"
                />
              </Grid>
              <Grid item xs={6}>
                <Stat
                  icon={<BatteryChargingFullIcon sx={{ fontSize: 16 }} />}
                  label="Battery"
                  value={battery != null ? battery.toFixed(1) : undefined}
                  unit="%"
                  accent="var(--accent-green)"
                />
              </Grid>
              <Grid item xs={6}>
                <Stat
                  icon={<HeightIcon sx={{ fontSize: 16 }} />}
                  label="Altitude"
                  value={altitude != null ? altitude.toFixed(1) : undefined}
                  unit="m"
                  accent="var(--accent-purple)"
                />
              </Grid>
              <Grid item xs={6}>
                <Stat
                  icon={<ExploreIcon sx={{ fontSize: 16 }} />}
                  label="Heading"
                  value={heading != null ? heading.toFixed(0) : undefined}
                  unit="°"
                  accent="var(--accent-cyan)"
                />
              </Grid>
              <Grid item xs={6}>
                <Stat
                  icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                  label="Ground Speed"
                  value={groundSpeed != null ? groundSpeed.toFixed(1) : undefined}
                  unit="m/s"
                  accent="var(--accent-yellow)"
                />
              </Grid>
              <Grid item xs={6}>
                <Stat
                  icon={<TrendingUpIcon sx={{ fontSize: 16 }} />}
                  label="Climb Rate"
                  value={climb != null ? climb.toFixed(1) : undefined}
                  unit="m/s"
                  accent="var(--accent-cyan)"
                />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* Trends Section */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              p: 2,
              borderRadius: 'var(--radius-md)',
              bgcolor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              height: '100%',
            }}
          >
            <Box className="section-header" sx={{ mb: 2 }}>
              <Typography className="section-title">Trends</Typography>
              <Box className="section-line" />
            </Box>

            <Stack spacing={2}>
              <Sparkline
                title="Altitude"
                unit="m"
                data={history.map((p) => ({ t: p.t, value: p.altitude }))}
                color="var(--accent-purple)"
              />
              <Sparkline
                title="Battery"
                unit="%"
                data={history.map((p) => ({ t: p.t, value: p.battery }))}
                color="var(--accent-green)"
              />
            </Stack>
          </Box>
        </Grid>

        {/* Debug Panel - Raw Telemetry Data */}
        {debugData && (
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 'var(--radius-md)',
                bgcolor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Box className="section-header" sx={{ mb: 2 }}>
                <Typography className="section-title">Raw Telemetry Data (All Fields Received)</Typography>
                <Box className="section-line" />
              </Box>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 1.5,
                }}
              >
                {Object.entries(debugData).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      p: 1.5,
                      borderRadius: 'var(--radius-sm)',
                      bgcolor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5,
                        fontWeight: 600,
                      }}
                    >
                      {key}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-mono)',
                        color: value != null ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontWeight: 500,
                        wordBreak: 'break-word',
                      }}
                    >
                      {value != null ? String(value) : 'null'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default DroneDetailPanel
