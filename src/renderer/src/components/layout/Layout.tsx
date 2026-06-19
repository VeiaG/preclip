import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { AppSidebar } from './Sidebar'

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
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarChange}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-10 shrink-0 items-center gap-2 border-b px-3 sticky top-0 left-0 right-0 z-10 bg-background rounded-t-2xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" />
        </header>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
