import { useState, useEffect } from 'react'
import { Minus, Maximize2, Minimize2, X, PanelLeft } from 'lucide-react'

interface TitleBarProps {
  sidebarOpen: boolean
  onSidebarToggle: () => void
}

export function TitleBar({ sidebarOpen, onSidebarToggle }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.windowControls.isMaximized().then(setIsMaximized)
    return window.api.windowControls.onMaximizeChange(setIsMaximized)
  }, [])

  return (
    <div
      className="flex items-center h-9 shrink-0 bg-sidebar select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Sidebar toggle — no drag */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onSidebarToggle}
          className="flex items-center justify-center h-9 w-12 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <PanelLeft className="size-4" />
        </button>
      </div>

      {/* App branding */}
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[16px] font-semibold text-sidebar-foreground">Pre<span className="text-sidebar-primary">Clip</span></span>
      </div>

      {/* Drag spacer */}
      <div className="flex-1" />

      {/* Window controls — no drag */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.api.windowControls.minimize()}
          className="flex items-center justify-center h-full w-12 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Minimize"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          onClick={() => window.api.windowControls.maximize()}
          className="flex items-center justify-center h-full w-12 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized
            ? <Minimize2 className="size-3.5" />
            : <Maximize2 className="size-3.5" />
          }
        </button>
        <button
          onClick={() => window.api.windowControls.close()}
          className="flex items-center justify-center h-full w-12 text-sidebar-foreground/60 hover:text-white hover:bg-red-500 transition-colors"
          title="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
