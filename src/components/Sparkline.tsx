import { useMemo } from 'react'
import { Box, Typography } from '@mui/material'

type SparklineProps = {
  title: string
  data: Array<{ t: number; value?: number }>
  unit?: string
  color?: string
}

const Sparkline = ({ title, data, unit, color = '#7dd3fc' }: SparklineProps) => {
  const points = useMemo(() => data.filter((d) => typeof d.value === 'number'), [data])

  if (!points.length) {
    return (
      <Box display="flex" flexDirection="column" gap={0.5}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="subtitle2" color="text.disabled">
          —
        </Typography>
      </Box>
    )
  }

  const values = points.map((p) => p.value as number)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const width = 160
  const height = 48

  const path = points
    .map((p, idx) => {
      const x = (idx / Math.max(points.length - 1, 1)) * width
      const y = height - ((p.value as number) - min) * (height / range)
      return `${x},${y}`
    })
    .join(' ')

  const latest = points[points.length - 1]?.value

  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <svg width={width} height={height} aria-label={title}>
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={path}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <Typography variant="subtitle1" color="text.primary">
          {latest?.toFixed(1)}
          {unit ? ` ${unit}` : ''}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        min {min.toFixed(1)}{unit ? ` ${unit}` : ''} · max {max.toFixed(1)}
        {unit ? ` ${unit}` : ''}
      </Typography>
    </Box>
  )
}

export default Sparkline

