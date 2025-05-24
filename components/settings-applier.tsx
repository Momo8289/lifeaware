'use client'

import { useAppearanceSettings } from '@/hooks/use-appearance-settings'
import { useTheme } from 'next-themes'
import { useEffect } from 'react'
import { themes } from '@/components/ui/theme-selector'

export function SettingsApplier() {
  const { settings, isLoading } = useAppearanceSettings()
  const { setTheme, resolvedTheme } = useTheme()

  // Apply display mode to next-themes
  useEffect(() => {
    if (isLoading) return
    setTheme(settings.displayMode)
  }, [settings.displayMode, setTheme, isLoading])

  // Apply font size when settings change
  useEffect(() => {
    if (isLoading) return

    const fontSizes = [
      { name: "default", size: "1rem" },
      { name: "medium", size: "1.125rem" },
      { name: "large", size: "1.25rem" }
    ]
    
    const fontSizeOption = fontSizes.find((fs) => fs.name === settings.fontSize)
    if (!fontSizeOption) return

    const root = document.documentElement
    
    // Set the base font size on the document root
    root.style.fontSize = fontSizeOption.size
    
    // Also set CSS custom properties for explicit use
    root.style.setProperty('--font-size-base', fontSizeOption.size)

    // Scale other font sizes proportionally based on the new base
    const baseSize = parseFloat(fontSizeOption.size)
    root.style.setProperty('--font-size-sm', `${baseSize * 0.875}rem`)
    root.style.setProperty('--font-size-lg', `${baseSize * 1.125}rem`)
    root.style.setProperty('--font-size-xl', `${baseSize * 1.25}rem`)
    root.style.setProperty('--font-size-2xl', `${baseSize * 1.5}rem`)
    
    // Set specific font sizes for common text elements
    root.style.setProperty('--font-size-xs', `${baseSize * 0.75}rem`)
    root.style.setProperty('--font-size-3xl', `${baseSize * 1.875}rem`)
    root.style.setProperty('--font-size-4xl', `${baseSize * 2.25}rem`)
  }, [settings.fontSize, isLoading])

  // Apply theme when settings or resolved theme change
  useEffect(() => {
    if (isLoading || settings.colorTheme === 'default') return

    const theme = themes.find((t) => t.name === settings.colorTheme)
    if (!theme) return

    const root = document.documentElement
    const isDark = resolvedTheme === "dark"
    const variables = isDark ? theme.cssVariables.dark : theme.cssVariables.light

    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
  }, [settings.colorTheme, resolvedTheme, isLoading])

  // This component doesn't render anything
  return null
} 