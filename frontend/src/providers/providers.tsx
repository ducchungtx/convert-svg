'use client'

import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      // Disable automatic session polling which causes excessive API calls
      refetchInterval={0}
      refetchOnWindowFocus={false}
      // Only refetch session manually when needed
      refetchWhenOffline={false}
    >
      {children}
      <Toaster richColors position="top-right" />
    </SessionProvider>
  )
}
