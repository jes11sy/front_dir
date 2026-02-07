'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DesignVersion = 'v1' | 'v2'
export type ThemeMode = 'light' | 'dark'

interface DesignState {
  version: DesignVersion
  theme: ThemeMode
  setVersion: (version: DesignVersion) => void
  toggleVersion: () => void
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      version: 'v1',
      theme: 'light',
      setVersion: (version) => set({ version }),
      toggleVersion: () => set({ version: get().version === 'v1' ? 'v2' : 'v1' }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: 'design-storage',
    }
  )
)
