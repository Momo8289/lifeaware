import { Separator } from "@/components/ui/separator"
import { FontSizeSelector } from "@/components/ui/font-size-selector"
import { ModeSelector } from "@/components/ui/mode-selector"
import { ThemeSelector } from "@/components/ui/theme-selector"

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the application
        </p>
      </div>
      <Separator />
      
      <div className="space-y-8">
        <FontSizeSelector />
        <Separator />
        <ModeSelector />
        <Separator />
        <ThemeSelector />
      </div>
    </div>
  )
} 