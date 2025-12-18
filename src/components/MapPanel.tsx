import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Box, Stack, Typography } from '@mui/material'
import type { DroneSummary, Telemetry } from '../api/types'
import type { DroneMeta, DroneTrackState, TrackSegment } from '../hooks/useDroneTracks'

type MapPanelProps = {
  drones: DroneSummary[]
  selectedId: string | null
  telemetry?: Telemetry
  onSelect: (id: string) => void
  tracks: DroneTrackState
  metaByDrone: Record<string, DroneMeta>
  showTracks: boolean
}

type LatLng = [number, number]

const simplifySegment = (segment: TrackSegment, maxPoints = 160, minDelta = 0.00001) => {
  if (segment.length <= 2) return segment

  const deduped: TrackSegment = [segment[0]]
  for (let i = 1; i < segment.length; i += 1) {
    const prev = deduped[deduped.length - 1]
    const curr = segment[i]
    if (Math.abs(prev.lat - curr.lat) + Math.abs(prev.lon - curr.lon) < minDelta) continue
    deduped.push(curr)
  }

  if (deduped.length <= maxPoints) return deduped
  const step = Math.ceil(deduped.length / maxPoints)
  return deduped.filter((_, idx) => idx % step === 0 || idx === deduped.length - 1)
}

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

const MapPanel = ({
  drones,
  selectedId,
  telemetry,
  onSelect,
  tracks,
  metaByDrone,
  showTracks,
}: MapPanelProps) => {
  const [zoom] = useState(6)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [mapCenter, setMapCenter] = useState<LatLng>(() => {
    if (typeof telemetry?.latitude === 'number' && typeof telemetry?.longitude === 'number') {
      return [telemetry.latitude, telemetry.longitude]
    }
    const match = drones.find((d) => d.id === selectedId)
    if (typeof match?.position?.lat === 'number' && typeof match?.position?.lon === 'number') {
      return [match.position.lat, match.position.lon]
    }
    return [20, 0]
  })
  const lastSelectedRef = useRef<string | null>(selectedId)

  useEffect(() => {
    // Mark as initialized after first render to enable animations
    const timer = setTimeout(() => setHasInitialized(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (selectedId && lastSelectedRef.current !== selectedId) {
      lastSelectedRef.current = selectedId
      const match = drones.find((d) => d.id === selectedId)
      const lat =
        (selectedId === telemetry?.drone_id && typeof telemetry?.latitude === 'number'
          ? telemetry.latitude
          : match?.position?.lat)
      const lon =
        (selectedId === telemetry?.drone_id && typeof telemetry?.longitude === 'number'
          ? telemetry.longitude
          : match?.position?.lon)
      if (typeof lat === 'number' && typeof lon === 'number') {
        setMapCenter([lat, lon])
      }
    }
  }, [drones, selectedId, telemetry?.drone_id, telemetry?.latitude, telemetry?.longitude])

  const selectedPosition: LatLng | null = (() => {
    if (
      selectedId === telemetry?.drone_id &&
      typeof telemetry?.latitude === 'number' &&
      typeof telemetry?.longitude === 'number'
    ) {
      return [telemetry.latitude, telemetry.longitude]
    }
    const match = drones.find((d) => d.id === selectedId)
    if (typeof match?.position?.lat === 'number' && typeof match?.position?.lon === 'number') {
      return [match.position.lat, match.position.lon]
    }
    return null
  })()

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
          center={mapCenter}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          preferCanvas
        >
          <MapAutoCenter center={mapCenter} shouldAnimate={hasInitialized} />
          
          {/* Dark map tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* Drone tracks */}
          {showTracks &&
            Object.entries(selectedId ? { [selectedId]: tracks[selectedId] ?? [] } : tracks).map(
              ([droneId, segments]) => {
                const meta = metaByDrone[droneId]
                const color = meta?.color ?? '#3b82f6'
                const isSelected = droneId === selectedId

                return segments
                  .filter((segment) => segment.length >= 2)
                  .map((segment, idx) => {
                    const simplified = simplifySegment(segment)
                    return (
                      <Polyline
                        key={`${droneId}-${idx}`}
                        positions={simplified.map((p) => [p.lat, p.lon] as LatLng)}
                        pathOptions={{
                          color,
                          weight: isSelected ? 4 : 3,
                          opacity: isSelected ? 0.9 : 0.7,
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={0.85}>
                          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            {droneId}
                          </Typography>
                        </Tooltip>
                      </Polyline>
                    )
                  })
              },
            )}

          {/* Drone markers */}
          {(selectedId ? drones.filter((d) => d.id === selectedId) : drones).map((drone) => {
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
