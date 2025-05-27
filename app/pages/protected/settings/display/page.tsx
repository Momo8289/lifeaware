import { Separator } from "@/components/ui/separator"

export default function DisplayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Display</h3>
        <p className="text-sm text-muted-foreground">
          Choose how information is displayed
        </p>
      </div>
      <Separator />
      <div className="p-4 border rounded-md">
        <p className="text-muted-foreground">Display settings are coming soon.</p>
      </div>
    </div>
  )
} 