import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from './Sidebar'
import { TitleBar } from './TitleBar'

const SIDEBAR_KEY = 'sidebar_open'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY)
    return stored === null ? true : stored === 'true'
  })

  function handleSidebarChange(open: boolean) {
    setSidebarOpen(open)
    localStorage.setItem(SIDEBAR_KEY, String(open))
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar
        sidebarOpen={sidebarOpen}
        onSidebarToggle={() => handleSidebarChange(!sidebarOpen)}
      />
      <SidebarProvider
        open={sidebarOpen}
        onOpenChange={handleSidebarChange}
        style={{ minHeight: 0, flex: 1 }}
      >
        <AppSidebar />
        <SidebarInset>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
