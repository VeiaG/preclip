import { useNavigate } from 'react-router-dom'
import { Film, Clapperboard, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const tools = [
  {
    title: 'Compress Video',
    description: 'Reduce file size while keeping quality',
    icon: Film,
    to: '/compress',
    available: true,
    tag: null,
  },
  {
    title: 'GIF Converter',
    description: 'Convert video clips into animated GIFs',
    icon: Clapperboard,
    to: '/gif',
    available: false,
    tag: 'Soon',
  },
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-1">Tools</h1>
      <p className="text-muted-foreground mb-8">Choose a tool to get started</p>

      <div className="grid grid-cols-2 gap-4 max-w-xl">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.to}
              disabled={!tool.available}
              onClick={() => navigate(tool.to)}
              className={cn(
                'group text-left border rounded-xl p-5 flex flex-col gap-3 transition-colors',
                tool.available
                  ? 'hover:bg-accent cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="w-5 h-5" />
                </div>
                {tool.tag && (
                  <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded-full">
                    {tool.tag}
                  </span>
                )}
                {tool.available && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{tool.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{tool.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
