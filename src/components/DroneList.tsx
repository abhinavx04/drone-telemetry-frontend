import { useMemo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import FlightIcon from '@mui/icons-material/Flight'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import GpsOffIcon from '@mui/icons-material/GpsOff'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { DroneSummary } from '../api/types'

dayjs.extend(relativeTime)

type DroneListProps = {
  drones: DroneSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  staleThresholdMs: number
  currentTimeMs: number
}

// Circular battery gauge component
const BatteryGauge = ({ value }: { value: number }) => {
  const size = 44
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value < 20 ? 'var(--accent-red)' : value < 50 ? 'var(--accent-yellow)' : 'var(--accent-green)'

  return (
    <Box className="circular-gauge" sx={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
        />
      </svg>
      <Typography className="circular-gauge-text">
        {value.toFixed(0)}
      </Typography>
    </Box>
  )
}

const DroneList = ({
  drones,
  selectedId,
  onSelect,
  staleThresholdMs,
  currentTimeMs,
}: DroneListProps) => {
  const sorted = useMemo(
    () => [...drones].sort((a, b) => b.last_seen_ts - a.last_seen_ts),
    [drones],
  )

  return (
    <Box>
      {/* Section Header */}
      <Box className="section-header">
        <Typography className="section-title">Fleet Overview</Typography>
        <Box className="section-line" />
        <Typography className="section-badge">{drones.length} drones</Typography>
      </Box>

      {/* Drone List */}
      <Stack spacing={1}>
        {sorted.map((drone, idx) => {
          const lastSeenMs = drone.last_seen_ts * 1000
          const isStale = currentTimeMs - lastSeenMs > staleThresholdMs
          const isSelected = drone.id === selectedId
          const gps = drone.gps_fix
          const emergency = drone.is_emergency

          return (
            <Box
              key={drone.id}
              className={`drone-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect(drone.id)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => e.key === 'Enter' && onSelect(drone.id)}
              sx={{
                animationDelay: `${idx * 50}ms`,
              }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                {/* Drone Icon with Status */}
                <Box sx={{ position: 'relative' }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-md)',
                      bgcolor: isSelected 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <FlightIcon
                      sx={{
                        fontSize: 22,
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        transform: 'rotate(45deg)',
                      }}
                    />
                  </Box>
                  {/* Status indicator dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: isStale ? 'var(--accent-yellow)' : 'var(--accent-green)',
                      border: '2px solid var(--bg-card)',
                      boxShadow: isStale 
                        ? '0 0 8px var(--accent-yellow)' 
                        : '0 0 8px var(--accent-green)',
                    }}
                  />
                </Box>

                {/* Drone Info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {drone.id}
                    </Typography>
                    
                    {/* Status badge */}
                    <Box
                      className={`status-badge ${isStale ? 'status-stale' : 'status-online'}`}
                    >
                      {isStale ? 'STALE' : drone.status?.toUpperCase() || 'ONLINE'}
                    </Box>

                    {/* Emergency indicator */}
                    {emergency && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.25,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 1,
                          bgcolor: 'rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        <WarningAmberIcon sx={{ fontSize: 12, color: 'var(--accent-red)' }} />
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'var(--accent-red)' }}>
                          EMERGENCY
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {/* Flight mode */}
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                      }}
                    >
                      {drone.flight_mode || '—'}
                    </Typography>

                    {/* Last seen */}
                    <Typography
                      sx={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {lastSeenMs ? dayjs(lastSeenMs).fromNow() : '—'}
                    </Typography>

                    {/* GPS indicator */}
                    {gps != null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        {gps ? (
                          <GpsFixedIcon sx={{ fontSize: 14, color: 'var(--accent-green)' }} />
                        ) : (
                          <GpsOffIcon sx={{ fontSize: 14, color: 'var(--accent-yellow)' }} />
                        )}
                      </Box>
                    )}
                  </Stack>
                </Box>

                {/* Battery gauge */}
                {drone.battery_pct != null && (
                  <BatteryGauge value={drone.battery_pct} />
                )}
              </Stack>
            </Box>
          )
        })}

        {/* Empty state */}
        {drones.length === 0 && (
          <Box
            sx={{
              py: 6,
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <FlightIcon sx={{ fontSize: 48, opacity: 0.3, mb: 2 }} />
            <Typography variant="body2">No drones connected</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

export default DroneList
