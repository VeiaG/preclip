const GAME_GRADIENTS: Record<string, [string, string]> = {
  'cs2': ['#F97316', '#991B1B'],
  'counter-strike 2': ['#F97316', '#991B1B'],
  'counter-strike': ['#F97316', '#991B1B'],
  'valorant': ['#FF4655', '#831843'],
  'fortnite': ['#2563EB', '#7C3AED'],
  'apex legends': ['#CC3300', '#78350F'],
  'minecraft': ['#16A34A', '#4D7C0F'],
  'league of legends': ['#B45309', '#1C1917'],
  'overwatch 2': ['#D97706', '#C2410C'],
  'overwatch': ['#D97706', '#C2410C'],
  'gta v': ['#1C1917', '#CA8A04'],
  'grand theft auto v': ['#1C1917', '#CA8A04'],
  'cyberpunk 2077': ['#FACC15', '#0E7490'],
  'the witcher 3: wild hunt': ['#7C2D12', '#D97706'],
  'the witcher 3': ['#7C2D12', '#D97706'],
  'red dead redemption 2': ['#7C2D12', '#C2410C'],
  'call of duty': ['#1C1917', '#78716C'],
  'warzone': ['#1C1917', '#16A34A'],
  'pubg: battlegrounds': ['#C2410C', '#92400E'],
  'pubg': ['#C2410C', '#92400E'],
  'rust': ['#B45309', '#7C2D12'],
  'dota 2': ['#DC2626', '#7F1D1D'],
  'team fortress 2': ['#C2410C', '#7F1D1D'],
  'escape from tarkov': ['#374151', '#111827'],
  'rainbow six siege': ['#1E3A5F', '#374151'],
  'tom clancy\'s rainbow six siege': ['#1E3A5F', '#374151'],
  'destiny 2': ['#1E3A5F', '#7F1D1D'],
  'battlefield': ['#1E3A5F', '#6B4226'],
  'battlefield 2042': ['#1E3A5F', '#6B4226'],
  'elden ring': ['#92400E', '#1C1917'],
  'halo infinite': ['#1D4ED8', '#7F1D1D'],
  'sea of thieves': ['#0C4A6E', '#713F12'],
  'rocket league': ['#7C3AED', '#1D4ED8'],
  'fall guys': ['#7C3AED', '#EC4899'],
  'among us': ['#7F1D1D', '#1C1917'],
  'phasmophobia': ['#111827', '#374151'],
  'dead by daylight': ['#7F1D1D', '#111827'],
  'back 4 blood': ['#7F1D1D', '#374151'],
  'mortal kombat 1': ['#7F1D1D', '#111827'],
  'street fighter 6': ['#DC2626', '#111827'],
  'tekken 8': ['#D97706', '#111827'],
  'star wars jedi: survivor': ['#0C4A6E', '#111827'],
  'hogwarts legacy': ['#6B21A8', '#1E3A5F'],
  'baldur\'s gate 3': ['#6B21A8', '#1C1917'],
}

function hashToGradient(str: string): [string, string] {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i)
  h = Math.abs(h)
  const hue1 = h % 360
  const hue2 = (hue1 + 50) % 360
  return [`hsl(${hue1}, 55%, 28%)`, `hsl(${hue2}, 55%, 18%)`]
}

export function getGameGradient(name: string): [string, string] {
  return GAME_GRADIENTS[name.toLowerCase().trim()] ?? hashToGradient(name.toLowerCase())
}

export function getGameInitials(name: string): string {
  const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .filter(w => w.length > 2 || words.length <= 2)
    .slice(0, 3)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}
