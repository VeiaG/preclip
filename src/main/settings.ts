import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { AppSettings } from '../shared/types'

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

const defaults: AppSettings = {
  maxParallelJobs: 1,
  outputDir: null,
  nvidiaCapturesPath: null,
}

export function getSettings(): AppSettings {
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8')) }
  } catch {
    return { ...defaults }
  }
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const updated = { ...getSettings(), ...partial }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
