"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Breadcrumb } from "@/components/ui/breadcrumb"

export function SiteHeader() {
  const pathname = usePathname()
  
  // Generate breadcrumb segments based on the current path
  const generateBreadcrumbs = () => {
    // Special case for settings pages
    if (pathname.startsWith("/settings") || pathname.includes("/(protected)/settings")) {
      // Create breadcrumbs for settings pages
      const breadcrumbs = [
        { title: "Settings", href: "/settings" }
      ]
      
      // Check if we're in a specific settings section
      if (pathname !== "/settings" && !pathname.endsWith("/(protected)/settings")) {
        // Get the last segment of the path
        const segments = pathname.split('/')
        const lastSegment = segments[segments.length - 1]
        
        // Format the segment title to be more readable
        const title = lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
        
        // Add the specific settings section
        breadcrumbs.push({ title, href: pathname })
      } else {
        // On the main settings page, show "Profile" with a slightly different href to avoid key conflicts
        breadcrumbs.push({ title: "Profile", href: "/settings/profile" })
      }
      
      return breadcrumbs
    }
    
    // For non-settings pages, generate breadcrumbs from the path
    const pathSegments = pathname.split('/').filter(segment => 
      segment && segment !== '(protected)'
    )
    
    // Generate breadcrumb items
    const breadcrumbs = pathSegments.map((segment, index) => {
      // Generate the href for this segment
      const href = `/${pathSegments.slice(0, index + 1).join('/')}`
      
      // Format the segment title to be more readable
      const title = segment.charAt(0).toUpperCase() + segment.slice(1)
      
      return { title, href }
    })
    
    return breadcrumbs
  }
  
  const breadcrumbs = generateBreadcrumbs()
  
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb 
            segments={breadcrumbs} 
            homeLink="/dashboard"
          />
        </div>
        <ThemeSwitcher />
      </div>
    </header>
  )
}
