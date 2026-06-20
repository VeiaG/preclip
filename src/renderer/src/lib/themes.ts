export const VISUAL_THEMES = [
  { slug: 'default', label: 'Default' },
  { slug: 't3', label: 'T3' },
] as const

export type VisualTheme = (typeof VISUAL_THEMES)[number]['slug']
