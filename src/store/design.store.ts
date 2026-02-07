'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DesignVersion = 'v1' | 'v2'

interface DesignState {
  version: DesignVersion
  setVersion: (version: DesignVersion) => void
  toggleVersion: () => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      version: 'v1',
      setVersion: (version) => set({ version }),
      toggleVersion: () => set({ version: get().version === 'v1' ? 'v2' : 'v1' }),
    }),
    {
      name: 'design-storage',
    }
  )
)
