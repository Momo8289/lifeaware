"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useEffect, useState } from "react"

export function SiteHeader() {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<{ title: string; href: string }[]>([])
  const [isClient, setIsClient] = useState(false)
  
  // Generate breadcrumb segments based on the current path
  const generateBreadcrumbs = (useClientStorage = false) => {
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
      
      // Check if this is a UUID segment (likely a habit ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
      
      // Format the segment title to be more readable
      let title = segment.charAt(0).toUpperCase() + segment.slice(1);
      
      // If we're on the client and this is a UUID, check sessionStorage for a custom name
      if (useClientStorage && isUUID) {
        const storedName = sessionStorage.getItem(`breadcrumb_${segment}`);
        if (storedName) {
          title = storedName;
        }
      }
      
      return { title, href }
    })
    
    return breadcrumbs
  }
  
  // Initialize breadcrumbs with server-safe values
  useEffect(() => {
    setIsClient(true)
    // Now that we're on the client, we can safely use sessionStorage
    setBreadcrumbs(generateBreadcrumbs(true))
  }, [pathname])
  
  // Get initial breadcrumbs without client storage for SSR
  if (!isClient) {
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
              segments={generateBreadcrumbs(false)} 
              homeLink="/dashboard"
            />
          </div>
          <ThemeSwitcher />
        </div>
      </header>
    )
  }
  
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
