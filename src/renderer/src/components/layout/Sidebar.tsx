import { useLocation, NavLink } from 'react-router-dom'
import { Home, Film, Clapperboard, Settings, ListChecks, FlaskConical, Bug, Gamepad2 } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useJobs } from '@/context/JobsContext'

const mainNav = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/hub', label: 'Game Library', icon: Gamepad2, end: true },
  { to: '/compress', label: 'Compress', icon: Film, end: true },
  { to: '/gif', label: 'GIF', icon: Clapperboard, end: false },
]

export function AppSidebar() {
  const location = useLocation()
  const { jobs } = useJobs()
  const activeCount = jobs.filter((j) => j.status === 'running' || j.status === 'queued').length

  const isJobsActive = location.pathname === '/jobs' || location.pathname.startsWith('/jobs/')

  return (
    <Sidebar collapsible="icon" variant='inset'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1">
              <Film className="size-4 shrink-0 text-primary" />
              <span className="font-semibold text-sm group-data-[collapsible=icon]:hidden">
                VideoKit
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map(({ to, label, icon: Icon, end }) => {
                const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      render={<NavLink to={to} end={end} />}
                      isActive={isActive}
                      tooltip={label}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}

              {/* Jobs */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<NavLink to="/jobs" />}
                  isActive={isJobsActive}
                  tooltip="Jobs"
                >
                  <ListChecks />
                  <span className="flex-1">Jobs</span>
                  {activeCount > 0 && (
                    <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {activeCount}
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<NavLink to="/test" />}
              isActive={location.pathname === '/test'}
              tooltip="Video Test"
            >
              <FlaskConical />
              <span>Video Test</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<NavLink to="/debug" />}
              isActive={location.pathname === '/debug'}
              tooltip="Video Debug"
            >
              <Bug />
              <span>Video Debug</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<NavLink to="/settings" />}
              isActive={location.pathname === '/settings'}
              tooltip="Settings"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
