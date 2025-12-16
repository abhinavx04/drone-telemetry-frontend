import { useMemo } from 'react'
import { Alert, Box, Chip, Divider, Paper, Stack, Typography } from '@mui/material'
import Grid from '@mui/material/GridLegacy'
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

const Stat = ({ label, value }: { label: string; value: string | number | undefined }) => (
  <Box>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="h6" color="text.primary">
      {value ?? '—'}
    </Typography>
  </Box>
)

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
  const heading = telemetry?.heading_deg
  const groundSpeed = telemetry?.ground_speed_mps
  const climb = telemetry?.climb_rate_mps
  const altitude = telemetry?.absolute_altitude_m ?? summary?.position?.alt_m
  const battery = telemetry?.battery_percentage ?? summary?.battery_pct
  const mode = telemetry?.flight_mode ?? summary?.flight_mode
  const gps = telemetry?.gps_fix ?? summary?.gps_fix
  const emergency = telemetry?.is_emergency ?? summary?.is_emergency

  const lastSeenText = useMemo(() => {
    if (!lastUpdateMs) return '—'
    return dayjs(lastUpdateMs).from(currentTimeMs)
  }, [currentTimeMs, lastUpdateMs])

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }} elevation={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography variant="h6">{summary?.id ?? 'Select a drone'}</Typography>
          <Typography variant="body2" color="text.secondary">
            Live telemetry with auto-reconnect
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {summary?.status && (
            <Chip
              label={isStale ? 'STALE' : summary.status}
              color={isStale ? 'warning' : 'success'}
              size="small"
            />
          )}
          <Chip label={`Stream: ${streamState}`} size="small" variant="outlined" />
          {emergency && <Chip color="error" label="EMERGENCY" size="small" />}
          {gps != null && (
            <Chip
              color={gps ? 'success' : 'warning'}
              label={gps ? 'GPS OK' : 'NO GPS'}
              size="small"
              variant={gps ? 'filled' : 'outlined'}
            />
          )}
        </Stack>
      </Stack>

      {wsError && <Alert severity="warning">{wsError}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Flight data</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={6}>
                  <Stat label="Mode" value={mode ?? '—'} />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Stat label="Battery" value={battery != null ? `${battery.toFixed(1)}%` : '—'} />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Stat label="Altitude" value={altitude != null ? `${altitude.toFixed(1)} m` : '—'} />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Stat
                    label="Heading"
                    value={heading != null ? `${heading.toFixed(0)}°` : '—'}
                  />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Stat
                    label="Ground speed"
                    value={groundSpeed != null ? `${groundSpeed.toFixed(1)} m/s` : '—'}
                  />
                </Grid>
                <Grid item xs={6} sm={6}>
                  <Stat label="Climb rate" value={climb != null ? `${climb.toFixed(1)} m/s` : '—'} />
                </Grid>
              </Grid>
              <Divider />
              <Typography variant="body2" color="text.secondary">
                Last update: {lastSeenText}
              </Typography>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="subtitle1">Trends</Typography>
              <Sparkline
                title="Altitude"
                unit="m"
                data={history.map((p) => ({ t: p.t, value: p.altitude }))}
                color="#7c3aed"
              />
              <Sparkline
                title="Battery"
                unit="%"
                data={history.map((p) => ({ t: p.t, value: p.battery }))}
                color="#22c55e"
              />
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default DroneDetailPanel

