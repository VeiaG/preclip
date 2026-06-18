import { Clapperboard } from 'lucide-react'

export default function GifConverter() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Clapperboard className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold mb-2">GIF Converter</h1>
      <p className="text-sm text-muted-foreground">Coming soon</p>
    </div>
  )
}
