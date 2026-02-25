export type RingConfigItem = {
  _id: string
  name?: string
  displayName?: string
  value?: number
  hexCode?: string
  file?: string
  scale?: number
  posZ?: number
  isDefault?: boolean
  image?: string
  images?: Record<string, string>
  diamondShape?: RingConfigItem | string
  settingStyle?: RingConfigItem | string
  caratWeight?: RingConfigItem | string
  shank?: RingConfigItem | string
  shanks?: Array<RingConfigItem | string>
  matchingBandFile1?: string
  matchingBandFile2?: string
  category?: string
}

export type RingConfig = {
  heads: RingConfigItem[]
  shanks: RingConfigItem[]
  colors: RingConfigItem[]
  diamondShapes: RingConfigItem[]
  settingStyles: RingConfigItem[]
  caratWeights: RingConfigItem[]
  shankCategories?: { _id: string; name: string; displayName: string; sortOrder?: number; active?: boolean }[]
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

export const getRingConfig = async (): Promise<RingConfig> => {
  const response = await fetch(buildApiUrl('/api/public/config'))
  if (!response.ok) {
    throw new Error('Failed to load ring configuration')
  }

  return response.json()
}
