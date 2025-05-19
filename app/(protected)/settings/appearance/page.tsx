import { Separator } from "@/components/ui/separator"

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
      <div className="p-4 border rounded-md">
        <p className="text-muted-foreground">Appearance settings are coming soon.</p>
      </div>
    </div>
  )
} 