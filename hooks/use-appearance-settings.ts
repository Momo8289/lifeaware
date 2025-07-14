'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabase/client'

interface AppearanceSettings {
  fontSize: string
  colorTheme: string
  displayMode: string
}

export function useAppearanceSettings() {
  const [settings, setSettings] = useState<AppearanceSettings>({
    fontSize: 'default',
    colorTheme: 'default',
    displayMode: 'system'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  // Load settings from database or localStorage
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        let loadedSettings = {
          fontSize: 'default',
          colorTheme: 'default',
          displayMode: 'system'
        }

        if (user) {
          // Load from database
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('font_size, color_theme, display_mode')
            .eq('id', user.id)
            .single()

          if (!error && profile) {
            loadedSettings = {
              fontSize: profile.font_size || 'default',
              colorTheme: profile.color_theme || 'default',
              displayMode: profile.display_mode || 'system'
            }
          } else {
            // Fallback to localStorage
            loadedSettings = loadFromLocalStorage()
          }
        } else {
          // Not logged in, use localStorage
          loadedSettings = loadFromLocalStorage()
        }

        // Set the settings state
        setSettings(loadedSettings)
        
      } catch (error) {
        // Fallback to localStorage on error
        const fallbackSettings = loadFromLocalStorage()
        setSettings(fallbackSettings)
      } finally {
        setIsLoading(false)
      }
    }

    function loadFromLocalStorage() {
      const fontSize = localStorage.getItem('selected-font-size') || 'default'
      const colorTheme = localStorage.getItem('selected-theme') || 'default'
      const displayMode = localStorage.getItem('theme') || 'system'
      
      return {
        fontSize,
        colorTheme,
        displayMode
      }
    }

    loadSettings()
  }, [])

  // Save settings to database and localStorage
  const saveSettings = useCallback(async (newSettings: Partial<AppearanceSettings>) => {
    // Update state using functional update to avoid dependency on current settings
    setSettings(prevSettings => ({ ...prevSettings, ...newSettings }))

    // Save to localStorage immediately for offline support
    if (newSettings.fontSize !== undefined) {
      localStorage.setItem('selected-font-size', newSettings.fontSize)
    }
    if (newSettings.colorTheme !== undefined) {
      localStorage.setItem('selected-theme', newSettings.colorTheme)
    }
    if (newSettings.displayMode !== undefined) {
      localStorage.setItem('theme', newSettings.displayMode)
    }

    // Save to database if user is logged in
    if (user) {
      try {
        const updateData: any = { updated_at: new Date().toISOString() }
        
        if (newSettings.fontSize !== undefined) {
          updateData.font_size = newSettings.fontSize
        }
        if (newSettings.colorTheme !== undefined) {
          updateData.color_theme = newSettings.colorTheme
        }
        if (newSettings.displayMode !== undefined) {
          updateData.display_mode = newSettings.displayMode
        }

        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            ...updateData
          })

        if (error) {
          console.warn('Failed to save appearance settings to database:', error)
          // Continue with localStorage-only operation
        }
      } catch (error) {
        console.warn('Error saving appearance settings:', error)
        // Continue with localStorage-only operation
      }
    }
  }, [user])

  // Individual setters for convenience
  const setFontSize = useCallback((fontSize: string) => {
    saveSettings({ fontSize })
  }, [saveSettings])

  const setColorTheme = useCallback((colorTheme: string) => {
    saveSettings({ colorTheme })
  }, [saveSettings])

  const setDisplayMode = useCallback((displayMode: string) => {
    saveSettings({ displayMode })
  }, [saveSettings])

  return {
    settings,
    isLoading,
    setFontSize,
    setColorTheme,
    setDisplayMode,
    saveSettings
  }
} 