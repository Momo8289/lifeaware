"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAppearanceSettings } from "@/hooks/use-appearance-settings"
import {concatClasses} from "@/utils/helpers";

interface FontSizeOption {
  name: string
  label: string
  size: string
  description: string
}

const fontSizes: FontSizeOption[] = [
  {
    name: "default",
    label: "Default",
    size: "1rem",
    description: "Standard size (16px)"
  },
  {
    name: "medium",
    label: "Medium",
    size: "1.125rem",
    description: "Comfortable size (18px)"
  },
  {
    name: "large",
    label: "Large",
    size: "1.25rem",
    description: "Spacious size (20px)"
  }
]

interface FontSizeSelectorProps {
  className?: string
}

export function FontSizeSelector({ className }: FontSizeSelectorProps) {
  const { settings, isLoading, setFontSize } = useAppearanceSettings()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const applyFontSizeToDOM = React.useCallback((fontSizeName: string) => {
    const fontSizeOption = fontSizes.find((fs) => fs.name === fontSizeName)
    if (!fontSizeOption) return

    const root = document.documentElement
    
    // Set the base font size on the document root
    // This will scale all rem-based font sizes proportionally
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
  }, [])

  const handleFontSizeChange = React.useCallback((fontSizeName: string) => {
    applyFontSizeToDOM(fontSizeName)
    setFontSize(fontSizeName)
  }, [applyFontSizeToDOM, setFontSize])

  // Apply font size to DOM when settings change
  React.useEffect(() => {
    if (mounted && !isLoading) {
      applyFontSizeToDOM(settings.fontSize)
    }
  }, [mounted, isLoading, settings.fontSize, applyFontSizeToDOM])

  if (!mounted) {
    return (
      <div className={concatClasses("space-y-4", className)}>
        <div>
          <h4 className="text-sm font-medium mb-2">Font Size</h4>
          <p className="text-xs text-muted-foreground">
            Choose your preferred text size
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {fontSizes.map((fontSizeOption) => (
            <Card key={fontSizeOption.name} className="opacity-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-8 bg-gray-300 rounded" />
                    <div>
                      <div className="font-medium text-sm">{fontSizeOption.label}</div>
                      <div className="text-xs text-muted-foreground">
                        Loading...
                      </div>
                    </div>
                  </div>
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
        <h4 className="text-sm font-medium mb-2">Font Size</h4>
        <p className="text-xs text-muted-foreground">
          Choose your preferred text size
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {fontSizes.map((fontSizeOption) => {
          const isSelected = settings.fontSize === fontSizeOption.name
          
          return (
            <Card
              key={fontSizeOption.name}
              className={concatClasses(
                "cursor-pointer transition-all hover:ring-2 hover:ring-ring",
                isSelected && "ring-2 ring-ring"
              )}
              onClick={() => handleFontSizeChange(fontSizeOption.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-12 h-8 bg-muted rounded flex items-center justify-center font-medium"
                      style={{ fontSize: fontSizeOption.size }}
                    >
                      Aa
                    </div>
                    <div>
                      <div className="font-medium text-sm">{fontSizeOption.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {fontSizeOption.description}
                      </div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 