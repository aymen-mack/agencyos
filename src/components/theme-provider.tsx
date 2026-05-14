'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useEffect } from 'react'

function SuppressNextThemesScriptWarning() {
  useEffect(() => {
    const orig = console.error.bind(console)
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) return
      orig(...args)
    }
    return () => { console.error = orig }
  }, [])
  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SuppressNextThemesScriptWarning />
      {children}
    </NextThemesProvider>
  )
}
