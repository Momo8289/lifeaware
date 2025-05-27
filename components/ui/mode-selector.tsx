"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useAppearanceSettings } from "@/hooks/use-appearance-settings"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import {concatClasses} from "@/utils/helpers";

const modes = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    description: "Light mode",
  },
  {
    value: "dark",
    label: "Dark", 
    icon: Moon,
    description: "Dark mode",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    description: "System preference",
  },
] as const

interface ModeSelectorProps {
  className?: string
}

export function ModeSelector({ className }: ModeSelectorProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { settings, setDisplayMode } = useAppearanceSettings()
  const [mounted, setMounted] = React.useState(false)

  // Only render after mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Sync next-themes with user's saved display mode preference
  React.useEffect(() => {
    if (mounted && settings.displayMode && theme !== settings.displayMode) {
      setTheme(settings.displayMode)
    }
  }, [mounted, settings.displayMode, theme, setTheme])

  const handleModeChange = React.useCallback((mode: string) => {
    setTheme(mode)
    setDisplayMode(mode)
  }, [setTheme, setDisplayMode])

  if (!mounted) {
    return (
      <div className={concatClasses("space-y-4", className)}>
        <div>
          <h4 className="text-sm font-medium mb-2">Mode</h4>
          <p className="text-xs text-muted-foreground">
            Select light or dark mode, or use your system setting
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {modes.map((mode) => (
            <Card key={mode.value} className="opacity-50">
              <CardContent className="p-4 text-center">
                <mode.icon className="w-5 h-5 mx-auto mb-2" />
                <div className="text-sm font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">
                  {mode.description}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={concatClasses("space-y-4", className)}>
      <div>
        <h4 className="text-sm font-medium mb-2">Mode</h4>
        <p className="text-xs text-muted-foreground">
          Select light or dark mode, or use your system setting
          {theme === "system" && resolvedTheme && (
            <span className="block mt-1 text-xs text-muted-foreground">
              Currently using: {resolvedTheme}
            </span>
          )}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = theme === mode.value
          
          return (
            <Card
              key={mode.value}
              className={concatClasses(
                "cursor-pointer transition-all hover:ring-2 hover:ring-ring",
                isSelected && "ring-2 ring-ring"
              )}
              onClick={() => handleModeChange(mode.value)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="w-5 h-5 mx-auto mb-2" />
                <div className="text-sm font-medium">{mode.label}</div>
                <div className="text-xs text-muted-foreground">
                  {mode.description}
                  {isSelected && mode.value === "system" && resolvedTheme && (
                    <span className="block mt-1 font-medium">
                      ({resolvedTheme})
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 