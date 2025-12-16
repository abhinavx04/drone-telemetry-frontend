import { useMemo } from 'react'
import { Box, Stack, Typography } from '@mui/material'

type SparklineProps = {
  title: string
  data: Array<{ t: number; value?: number }>
  unit?: string
  color?: string
}

const Sparkline = ({ title, data, unit, color = 'var(--accent-blue)' }: SparklineProps) => {
  const points = useMemo(() => data.filter((d) => typeof d.value === 'number'), [data])

  if (!points.length) {
    return (
      <Box className="sparkline-container">
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            —
          </Typography>
        </Stack>
        <Box 
          sx={{ 
            height: 48, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            bgcolor: 'rgba(255,255,255,0.02)',
          }}
        >
          <Typography sx={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Waiting for data...
          </Typography>
        </Box>
      </Box>
    )
  }

  const values = points.map((p) => p.value as number)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const latest = points[points.length - 1]?.value as number

  const width = 200
  const height = 48
  const padding = 2

  // Create path points
  const pathPoints = points.map((p, idx) => {
    const x = padding + (idx / Math.max(points.length - 1, 1)) * (width - padding * 2)
    const y = padding + (height - padding * 2) - ((p.value as number) - min) * ((height - padding * 2) / range)
    return { x, y }
  })

  // Line path for the actual line
  const linePath = pathPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')

  // Area fill path
  const areaPath = `${linePath} L ${pathPoints[pathPoints.length - 1].x},${height} L ${pathPoints[0].x},${height} Z`

  return (
    <Box className="sparkline-container">
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
          {title}
        </Typography>
        <Typography 
          sx={{ 
            fontSize: '1rem', 
            fontWeight: 600, 
            color: 'var(--text-primary)', 
            fontFamily: 'var(--font-mono)',
          }}
        >
          {latest.toFixed(1)}
          {unit && <span style={{ fontSize: '0.75rem', marginLeft: 2, color: 'var(--text-secondary)' }}>{unit}</span>}
        </Typography>
      </Stack>

      <Box sx={{ position: 'relative' }}>
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-label={`${title} trend chart`}
        >
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          <path
            d={areaPath}
            fill={`url(#gradient-${title})`}
          />
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="sparkline-path"
            style={{
              filter: `drop-shadow(0 0 4px ${color})`,
            }}
          />

          {/* End dot */}
          {pathPoints.length > 0 && (
            <circle
              cx={pathPoints[pathPoints.length - 1].x}
              cy={pathPoints[pathPoints.length - 1].y}
              r="4"
              fill={color}
              style={{
                filter: `drop-shadow(0 0 6px ${color})`,
              }}
            />
          )}
        </svg>
      </Box>

      {/* Min/Max indicators */}
      <Stack direction="row" justifyContent="space-between" mt={0.75}>
        <Typography sx={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          min {min.toFixed(1)}{unit}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          max {max.toFixed(1)}{unit}
        </Typography>
      </Stack>
    </Box>
  )
}

export default Sparkline
