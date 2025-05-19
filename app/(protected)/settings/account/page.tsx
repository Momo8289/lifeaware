import { Separator } from "@/components/ui/separator"

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and change your password
        </p>
      </div>
      <Separator />
      <div className="p-4 border rounded-md">
        <p className="text-muted-foreground">Account settings are coming soon.</p>
      </div>
    </div>
  )
} 