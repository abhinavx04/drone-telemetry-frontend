import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Box, Stack, Typography } from '@mui/material'
import type { DroneSummary, Telemetry } from '../api/types'

type MapPanelProps = {
  drones: DroneSummary[]
  selectedId: string | null
  telemetry?: Telemetry
  onSelect: (id: string) => void
}

type LatLng = [number, number]

// Create custom drone icon with heading indicator
const createDroneIcon = (heading: number, isSelected: boolean, isStale: boolean) => {
  const primaryColor = isStale ? '#f59e0b' : isSelected ? '#3b82f6' : '#64748b'
  const glowColor = isStale ? '#f59e0b' : isSelected ? '#3b82f6' : 'transparent'
  
  const svg = `
    <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow-${isSelected ? 'selected' : 'normal'}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <g transform="rotate(${heading}, 24, 24)" filter="url(#glow-${isSelected ? 'selected' : 'normal'})">
        <!-- Outer ring -->
        <circle cx="24" cy="24" r="18" fill="none" stroke="${primaryColor}" stroke-width="2" opacity="${isSelected ? '0.4' : '0.2'}"/>
        <!-- Inner filled circle -->
        <circle cx="24" cy="24" r="10" fill="${primaryColor}" opacity="0.9"/>
        <!-- Direction indicator (nose) -->
        <polygon points="24,6 28,16 24,13 20,16" fill="${primaryColor}"/>
        <!-- Center dot -->
        <circle cx="24" cy="24" r="3" fill="#fff" opacity="0.9"/>
      </g>
      ${isSelected ? `<circle cx="24" cy="24" r="22" fill="none" stroke="${glowColor}" stroke-width="2" opacity="0.3"/>` : ''}
    </svg>
  `

  return L.divIcon({
    html: svg,
    className: 'drone-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  })
}

const MapAutoCenter = ({ center, shouldAnimate }: { center: LatLng; shouldAnimate: boolean }) => {
  const map = useMap()
  useEffect(() => {
    if (shouldAnimate) {
      map.flyTo(center, map.getZoom(), { duration: 0.8 })
    } else {
      map.setView(center, map.getZoom())
    }
  }, [center, map, shouldAnimate])
  return null
}

const MapPanel = ({ drones, selectedId, telemetry, onSelect }: MapPanelProps) => {
  const [zoom] = useState(6)
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    // Mark as initialized after first render to enable animations
    const timer = setTimeout(() => setHasInitialized(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const selectedPosition: LatLng | null = (() => {
    if (typeof telemetry?.latitude === 'number' && typeof telemetry?.longitude === 'number') {
      return [telemetry.latitude, telemetry.longitude]
    }
    const match = drones.find((d) => d.id === selectedId)
    if (typeof match?.position?.lat === 'number' && typeof match?.position?.lon === 'number') {
      return [match.position.lat, match.position.lon]
    }
    return null
  })()

  const initialCenter: LatLng = selectedPosition ?? [20, 0]

  return (
    <Box>
      {/* Section Header */}
      <Box className="section-header" sx={{ mb: 1.5 }}>
        <Typography className="section-title">Live Map</Typography>
        <Box className="section-line" />
        {selectedPosition && (
          <Typography 
            className="section-badge mono" 
            sx={{ fontSize: '10px' }}
          >
            {selectedPosition[0].toFixed(5)}, {selectedPosition[1].toFixed(5)}
          </Typography>
        )}
      </Box>

      {/* Map Container */}
      <Box 
        className="map-container"
        sx={{ 
          height: 380, 
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <MapContainer
          center={initialCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          preferCanvas
        >
          <MapAutoCenter center={initialCenter} shouldAnimate={hasInitialized} />
          
          {/* Dark map tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* Drone markers */}
          {drones.map((drone) => {
            const isSelected = drone.id === selectedId
            const lat = isSelected && telemetry?.latitude ? telemetry.latitude : drone.position?.lat
            const lon = isSelected && telemetry?.longitude ? telemetry.longitude : drone.position?.lon
            const heading = isSelected && typeof telemetry?.heading_deg === 'number' 
              ? telemetry.heading_deg 
              : 0
            
            if (typeof lat !== 'number' || typeof lon !== 'number') return null
            
            // Consider drone stale if not recently updated
            const isStale = false // Could be computed from last_seen_ts

            return (
              <Marker
                key={drone.id}
                position={[lat, lon]}
                icon={createDroneIcon(heading, isSelected, isStale)}
                eventHandlers={{ click: () => onSelect(drone.id) }}
              >
                <Tooltip 
                  direction="top" 
                  offset={[0, -20]} 
                  opacity={0.95}
                >
                  <Typography sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                    {drone.id}
                  </Typography>
                </Tooltip>
                
                <Popup>
                  <Box sx={{ minWidth: 160, p: 0.5 }}>
                    <Typography 
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        mb: 1,
                      }}
                    >
                      {drone.id}
                    </Typography>
                    
                    <Stack spacing={0.75}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Mode
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
                          {isSelected && telemetry?.flight_mode 
                            ? telemetry.flight_mode 
                            : drone.flight_mode || '—'}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Battery
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                          {isSelected && telemetry?.battery_percentage != null
                            ? `${telemetry.battery_percentage.toFixed(0)}%`
                            : drone.battery_pct != null
                              ? `${drone.battery_pct.toFixed(0)}%`
                              : '—'}
                        </Typography>
                      </Box>

                      {isSelected && telemetry?.absolute_altitude_m != null && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Altitude
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                            {telemetry.absolute_altitude_m.toFixed(1)} m
                          </Typography>
                        </Box>
                      )}

                      {isSelected && typeof telemetry?.heading_deg === 'number' && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Heading
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                            {telemetry.heading_deg.toFixed(0)}°
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>
      </Box>
    </Box>
  )
}

export default MapPanel
