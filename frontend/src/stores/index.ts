import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { User, Conversion } from '@/types'

interface UserState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  updateUsage: () => void
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
      user: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      updateUsage: () => {
        const { user } = get()
        if (user) {
          set({
            user: {
              ...user,
              usedToday: user.usedToday + 1
            }
          })
        }
      }
    }),
    {
      name: 'user-store'
    }
  )
)

interface ConversionState {
  conversions: Conversion[]
  isLoading: boolean
  setConversions: (conversions: Conversion[]) => void
  addConversion: (conversion: Conversion) => void
  updateConversion: (id: number, updates: Partial<Conversion>) => void
  setLoading: (loading: boolean) => void
}

export const useConversionStore = create<ConversionState>()(
  devtools(
    (set) => ({
      conversions: [],
      isLoading: false,
      setConversions: (conversions) => set({ conversions }),
      addConversion: (conversion) =>
        set((state) => ({
          conversions: [conversion, ...state.conversions]
        })),
      updateConversion: (id, updates) =>
        set((state) => ({
          conversions: state.conversions.map((conv) =>
            conv.id === id ? { ...conv, ...updates } : conv
          )
        })),
      setLoading: (isLoading) => set({ isLoading })
    }),
    {
      name: 'conversion-store'
    }
  )
)
