import { useMemo } from 'react'
import {
  Avatar,
  Box,
  Chip,
  Divider,
  LinearProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
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

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'armed':
    case 'active':
    case 'flying':
      return 'success'
    case 'idle':
    case 'ready':
      return 'info'
    case 'error':
    case 'fault':
    case 'offline':
      return 'error'
    default:
      return 'warning'
  }
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Drones</Typography>
        <Typography variant="body2" color="text.secondary">
          {drones.length} active
        </Typography>
      </Stack>
      <Divider sx={{ mb: 1 }} />
      <List disablePadding>
        {sorted.map((drone, idx) => {
          const lastSeenMs = drone.last_seen_ts * 1000
          const isStale = currentTimeMs - lastSeenMs > staleThresholdMs
          const gps = drone.gps_fix
          const emergency = drone.is_emergency

          return (
            <ListItemButton
              key={drone.id}
              selected={drone.id === selectedId}
              alignItems="flex-start"
              onClick={() => onSelect(drone.id)}
              sx={{ borderRadius: 1, mb: 0.5 }}
            >
              <ListItemAvatar>
                <Avatar>{idx + 1}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1">{drone.id}</Typography>
                    <Chip
                      size="small"
                      label={isStale ? 'STALE' : drone.status || 'UNKNOWN'}
                      color={isStale ? 'warning' : statusColor(drone.status)}
                    />
                    {emergency && <Chip size="small" color="error" label="EMERGENCY" />}
                    {gps != null && (
                      <Chip size="small" color={gps ? 'success' : 'warning'} label={gps ? 'GPS' : 'NO GPS'} />
                    )}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {drone.flight_mode || '—'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lastSeenMs ? dayjs(lastSeenMs).fromNow() : '—'}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.5}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">
                          Battery
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {drone.battery_pct != null ? `${drone.battery_pct.toFixed(0)}%` : '—'}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={Number.isFinite(drone.battery_pct) ? drone.battery_pct : 0}
                        color={drone.battery_pct != null && drone.battery_pct < 20 ? 'error' : 'primary'}
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                    </Stack>
                  </Stack>
                }
              />
            </ListItemButton>
          )
        })}
      </List>
    </Box>
  )
}

export default DroneList

