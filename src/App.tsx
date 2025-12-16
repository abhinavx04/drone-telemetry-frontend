import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  AppBar,
  Box,
  Chip,
  CircularProgress,
  Container,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import './App.css'
import { getDrones, getHealth } from './api/client'
import type { DroneSummary } from './api/types'
import DroneList from './components/DroneList'
import DroneDetailPanel from './components/DroneDetailPanel'
import MapPanel from './components/MapPanel'
import { STALE_THRESHOLD_MS } from './config'
import { useLiveTelemetry } from './hooks/useLiveTelemetry'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const {
    data: health,
    isError: healthError,
    isLoading: healthLoading,
  } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
  })

  const {
    data: drones,
    isLoading: dronesLoading,
    isError: dronesError,
  } = useQuery({
    queryKey: ['drones'],
    queryFn: getDrones,
    refetchInterval: 5_000,
  })

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])

  const resolvedSelectedId = useMemo(() => {
    if (selectedId && drones?.some((d) => d.id === selectedId)) return selectedId
    if (!selectedId && drones?.length) return drones[0].id
    return drones?.[0]?.id ?? null
  }, [drones, selectedId])

  const selectedSummary = useMemo<DroneSummary | undefined>(
    () => drones?.find((d) => d.id === resolvedSelectedId),
    [drones, resolvedSelectedId],
  )

  const {
    telemetry,
    history,
    streamState,
    wsError,
    lastUpdateMs,
    isStale,
  } = useLiveTelemetry(resolvedSelectedId, nowMs)

  const showHealthWarning =
    healthError || (!healthLoading && health && health.status && health.status !== 'ok')

  return (
    <Box className="app-shell">
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Drone Telemetry</Typography>
            <Typography variant="body2" color="text.secondary">
              Live tracking, WebSocket stream with polling fallback
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {health?.mqtt_connected != null && (
              <Chip
                size="small"
                color={health.mqtt_connected ? 'success' : 'warning'}
                label={health.mqtt_connected ? 'MQTT connected' : 'MQTT unavailable'}
              />
            )}
            {health?.status && <Chip size="small" variant="outlined" label={`API ${health.status}`} />}
          </Stack>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {showHealthWarning && (
          <Alert severity={healthError ? 'error' : 'warning'} sx={{ mb: 2 }}>
            {healthError
              ? 'Backend health check failed. Verify API base URL, firewall, or service availability.'
              : `Backend health: ${health?.status || 'unknown'}${
                  health?.detail ? ` — ${health.detail}` : ''
                }`}
          </Alert>
        )}

        {dronesError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Unable to load drones. Check CORS/proxy config and API availability.
          </Alert>
        )}

        {(dronesLoading || healthLoading) && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Connecting to backend...
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <PaperSection>
              <DroneList
                drones={drones ?? []}
                selectedId={resolvedSelectedId}
                onSelect={setSelectedId}
                staleThresholdMs={STALE_THRESHOLD_MS}
                currentTimeMs={nowMs}
              />
            </PaperSection>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              <PaperSection>
                <MapPanel
                  drones={drones ?? []}
                  selectedId={resolvedSelectedId}
                  telemetry={telemetry?.drone_id === resolvedSelectedId ? telemetry : undefined}
                  onSelect={setSelectedId}
                />
              </PaperSection>
              <DroneDetailPanel
                summary={selectedSummary}
                telemetry={telemetry}
                history={history}
                streamState={streamState}
                wsError={wsError}
                lastUpdateMs={lastUpdateMs ?? (selectedSummary?.last_seen_ts ? selectedSummary.last_seen_ts * 1000 : undefined)}
                isStale={isStale}
                currentTimeMs={nowMs}
              />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

const PaperSection = ({ children }: { children: ReactNode }) => (
  <Box component="section" className="card">
    {children}
  </Box>
)

export default App
