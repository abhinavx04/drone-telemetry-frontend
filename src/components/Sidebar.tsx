import type React from 'react'
import { Box, Stack, Typography, Tooltip } from '@mui/material'

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard'
import RadarIcon from '@mui/icons-material/Radar'
import FlightIcon from '@mui/icons-material/Flight'
import TimelineIcon from '@mui/icons-material/Timeline'
import MapIcon from '@mui/icons-material/Map'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import BuildIcon from '@mui/icons-material/Build'
import AssessmentIcon from '@mui/icons-material/Assessment'
import NotificationsIcon from '@mui/icons-material/Notifications'
import SettingsIcon from '@mui/icons-material/Settings'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'

type NavItem = {
  id: string
  label: string
  icon: React.ReactNode
  badge?: number | string
  disabled?: boolean
}

type NavSection = {
  title?: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    items: [
      { id: 'command-center', label: 'Command Center', icon: <DashboardIcon /> },
      { id: 'live-tracking', label: 'Live Tracking', icon: <RadarIcon />, badge: 'LIVE' },
      { id: 'toggle-tracks', label: 'Show Tracks', icon: <MapIcon /> },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { id: 'fleet-management', label: 'Fleet Management', icon: <FlightIcon /> },
      { id: 'telemetry', label: 'Telemetry Data', icon: <TimelineIcon /> },
      { id: 'mission-planning', label: 'Mission Planning', icon: <MapIcon />, disabled: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'warehouse', label: 'Asset Inventory', icon: <WarehouseIcon />, disabled: true },
      { id: 'maintenance', label: 'Maintenance', icon: <BuildIcon />, disabled: true },
      { id: 'analytics', label: 'Analytics', icon: <AssessmentIcon />, disabled: true },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'alerts', label: 'Alerts', icon: <NotificationsIcon />, badge: 0 },
      { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
    ],
  },
]

type SidebarProps = {
  activeItem: string
  onNavigate: (id: string) => void
  collapsed?: boolean
  showTracks: boolean
  onToggleTracks: () => void
}

const Sidebar = ({ activeItem, onNavigate, collapsed = false, showTracks, onToggleTracks }: SidebarProps) => {
  return (
    <Box className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <Box className="sidebar-header">
        <Box className="sidebar-logo">
          <FlightTakeoffIcon sx={{ fontSize: 22 }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography className="sidebar-brand">AstroX</Typography>
            <Typography className="sidebar-tagline">Aerospace</Typography>
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box className="sidebar-nav">
        {navSections.map((section, sectionIdx) => (
          <Box key={sectionIdx} className="nav-section">
            {section.title && !collapsed && (
              <Typography className="nav-section-title">{section.title}</Typography>
            )}
            <Stack spacing={0.5}>
              {section.items.map((item) => {
                const isActive = activeItem === item.id
                const isDisabled = item.disabled

                const isTrackToggle = item.id === 'toggle-tracks'
                const dynamicLabel = isTrackToggle ? (showTracks ? 'Hide Tracks' : 'Show Tracks') : item.label
                const dynamicBadge =
                  isTrackToggle ? (showTracks ? 'ON' : 'OFF') : item.badge

                const handleClick = () => {
                  if (isDisabled) return
                  if (isTrackToggle) {
                    onToggleTracks()
                    return
                  }
                  onNavigate(item.id)
                }

                const handleKeyDown = (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' && !isDisabled) {
                    handleClick()
                  }
                }

                const navItem = (
                  <Box
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={handleClick}
                    tabIndex={isDisabled ? -1 : 0}
                    role="button"
                    onKeyDown={handleKeyDown}
                  >
                    <Box className="nav-item-icon">{item.icon}</Box>
                    {!collapsed && (
                      <>
                        <Typography className="nav-item-label">{dynamicLabel}</Typography>
                        {dynamicBadge !== undefined && (
                          <Box
                            className={`nav-item-badge ${dynamicBadge === 'LIVE' ? 'live' : ''}`}
                          >
                            {dynamicBadge === 'LIVE' ? (
                              <>
                                <Box className="live-dot-small" />
                                LIVE
                              </>
                            ) : (
                              dynamicBadge
                            )}
                          </Box>
                        )}
                      </>
                    )}
                  </Box>
                )

                return collapsed ? (
                  <Tooltip key={item.id} title={item.label} placement="right" arrow>
                    {navItem}
                  </Tooltip>
                ) : (
                  navItem
                )
              })}
            </Stack>
          </Box>
        ))}
      </Box>

      {/* Footer */}
      <Box className="sidebar-footer">
        <Tooltip title="Help & Documentation" placement="right" arrow>
          <Box
            className="nav-item"
            onClick={() => onNavigate('help')}
            tabIndex={0}
            role="button"
          >
            <Box className="nav-item-icon">
              <HelpOutlineIcon />
            </Box>
            {!collapsed && <Typography className="nav-item-label">Help Center</Typography>}
          </Box>
        </Tooltip>

        {/* Version info */}
        {!collapsed && (
          <Box className="sidebar-version">
            <Typography>v1.0.0</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default Sidebar

