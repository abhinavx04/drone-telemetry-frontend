import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/GridLegacy'
import './App.css'
import { getDrones, getHealth } from './api/client'
import type { DroneSummary } from './api/types'
import Sidebar from './components/Sidebar'
import DroneList from './components/DroneList'
import DroneDetailPanel from './components/DroneDetailPanel'
import MapPanel from './components/MapPanel'
import { STALE_THRESHOLD_MS } from './config'
import { useLiveTelemetry } from './hooks/useLiveTelemetry'

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [activeNav, setActiveNav] = useState('live-tracking')

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

  const isConnected = streamState === 'open' || (health?.status === 'ok' && !healthError)

  const handleNavigate = (id: string) => {
    setActiveNav(id)
    // Future: implement routing for different views
  }

  return (
    <Box className="app-shell">
      {/* Sidebar Navigation */}
      <Sidebar activeItem={activeNav} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <Box className="main-content">
        {/* Top Header Bar */}
        <Box component="header" className="header">
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            px: 3,
            py: 1.5,
            maxWidth: 1400,
            mx: 'auto',
            width: '100%',
          }}>
            {/* Page Title */}
            <Box>
              <Typography 
                sx={{ 
                  fontWeight: 700, 
                  fontSize: '1.25rem',
                  letterSpacing: '-0.01em',
                  color: 'var(--text-primary)'
                }}
              >
                {activeNav === 'live-tracking' && 'Live Tracking'}
                {activeNav === 'command-center' && 'Command Center'}
                {activeNav === 'fleet-management' && 'Fleet Management'}
                {activeNav === 'telemetry' && 'Telemetry Data'}
                {activeNav === 'alerts' && 'Alerts'}
                {activeNav === 'settings' && 'Settings'}
              </Typography>
              <Typography 
                sx={{ 
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                }}
              >
                Real-time drone monitoring and control
              </Typography>
            </Box>

            {/* Status Indicators */}
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Live indicator */}
              {isConnected && (
                <Box className="live-indicator">
                  <Box className="live-dot" />
                  <span>LIVE</span>
                </Box>
              )}

              {/* MQTT Status */}
              {health?.mqtt_connected != null && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={health.mqtt_connected ? 'MQTT' : 'MQTT offline'}
                  sx={{
                    borderColor: health.mqtt_connected 
                      ? 'rgba(34, 197, 94, 0.3)' 
                      : 'rgba(245, 158, 11, 0.3)',
                    color: health.mqtt_connected 
                      ? 'var(--accent-green)' 
                      : 'var(--accent-yellow)',
                    bgcolor: health.mqtt_connected 
                      ? 'rgba(34, 197, 94, 0.1)' 
                      : 'rgba(245, 158, 11, 0.1)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    height: 26,
                  }}
                />
              )}

              {/* API Status */}
              {health?.status && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`API ${health.status.toUpperCase()}`}
                  sx={{
                    borderColor: health.status === 'ok' 
                      ? 'var(--border-muted)' 
                      : 'rgba(239, 68, 68, 0.3)',
                    color: health.status === 'ok' 
                      ? 'var(--text-secondary)' 
                      : 'var(--accent-red)',
                    bgcolor: health.status === 'ok' 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    height: 26,
                  }}
                />
              )}

              {/* Drone count */}
              <Chip
                size="small"
                variant="outlined"
                label={`${drones?.length ?? 0} Drones`}
                sx={{
                  borderColor: 'var(--border-muted)',
                  color: 'var(--text-secondary)',
                  bgcolor: 'rgba(255, 255, 255, 0.03)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  height: 26,
                }}
              />
            </Stack>
          </Box>
        </Box>

        {/* Page Content */}
        <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
          <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
            {showHealthWarning && (
              <Alert 
                severity={healthError ? 'error' : 'warning'} 
                sx={{ 
                  mb: 2, 
                  borderRadius: 'var(--radius-md)',
                  bgcolor: healthError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid',
                  borderColor: healthError ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                }}
              >
                {healthError
                  ? 'Backend health check failed. Verify API base URL, firewall, or service availability.'
                  : `Backend health: ${health?.status || 'unknown'}${
                      health?.detail ? ` — ${health.detail}` : ''
                    }`}
              </Alert>
            )}

            {dronesError && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 'var(--radius-md)',
                  bgcolor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                Unable to load drones. Check CORS/proxy config and API availability.
              </Alert>
            )}

            {(dronesLoading || healthLoading) && (
              <Box 
                display="flex" 
                alignItems="center" 
                gap={1.5} 
                mb={2}
                sx={{
                  p: 2,
                  borderRadius: 'var(--radius-md)',
                  bgcolor: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                }}
              >
                <CircularProgress size={18} sx={{ color: 'var(--accent-blue)' }} />
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Connecting to backend...
                </Typography>
              </Box>
            )}

            <Grid container spacing={2.5}>
              <Grid item xs={12} lg={3}>
                <Card>
                  <DroneList
                    drones={drones ?? []}
                    selectedId={resolvedSelectedId}
                    onSelect={setSelectedId}
                    staleThresholdMs={STALE_THRESHOLD_MS}
                    currentTimeMs={nowMs}
                  />
                </Card>
              </Grid>
              <Grid item xs={12} lg={9}>
                <Stack spacing={2.5}>
                  <Card>
                    <MapPanel
                      drones={drones ?? []}
                      selectedId={resolvedSelectedId}
                      telemetry={telemetry?.drone_id === resolvedSelectedId ? telemetry : undefined}
                      onSelect={setSelectedId}
                    />
                  </Card>
                  <DroneDetailPanel
                    summary={selectedSummary}
                    telemetry={telemetry?.drone_id === resolvedSelectedId ? telemetry : undefined}
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
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

const Card = ({ children }: { children: ReactNode }) => (
  <Box component="section" className="card">
    {children}
  </Box>
)

export default App
