import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Box, Chip, Typography } from '@mui/material'
import type { DroneSummary, Telemetry } from '../api/types'

const defaultIcon = new L.Icon({
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type MapPanelProps = {
  drones: DroneSummary[]
  selectedId: string | null
  telemetry?: Telemetry
  onSelect: (id: string) => void
}

type LatLng = [number, number]

const MapAutoCenter = ({ center }: { center: LatLng }) => {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

const MapPanel = ({ drones, selectedId, telemetry, onSelect }: MapPanelProps) => {
  const [zoom] = useState(5)

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
    <Box height={400} borderRadius={2} overflow="hidden" border="1px solid rgba(255,255,255,0.08)">
      <MapContainer
        center={initialCenter as [number, number]}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        preferCanvas={true}
      >
        <MapAutoCenter center={initialCenter} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {drones.map((drone) => {
          const lat = telemetry?.drone_id === drone.id ? telemetry?.latitude : drone.position?.lat
          const lon = telemetry?.drone_id === drone.id ? telemetry?.longitude : drone.position?.lon
          if (typeof lat !== 'number' || typeof lon !== 'number') return null
          const isSelected = drone.id === selectedId
          return (
            <Marker
              key={drone.id}
              position={[lat, lon] as [number, number]}
              icon={defaultIcon as L.Icon<L.IconOptions>}
              eventHandlers={{ click: () => onSelect(drone.id) }}
            >
              <Tooltip permanent={false} direction="top" offset={[0, -12]} opacity={0.9}>
                <Typography variant="body2">{drone.id}</Typography>
              </Tooltip>
              <Popup>
                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Typography variant="subtitle2">{drone.id}</Typography>
                  <Typography variant="body2">Mode: {drone.flight_mode || '—'}</Typography>
                  <Typography variant="body2">
                    Battery: {drone.battery_pct != null ? `${drone.battery_pct.toFixed(0)}%` : '—'}
                  </Typography>
                  {isSelected && telemetry?.heading_deg != null && (
                    <Chip
                      label={`Heading ${telemetry.heading_deg.toFixed(0)}°`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </Box>
  )
}

export default MapPanel

