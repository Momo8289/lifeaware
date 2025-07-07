"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabase/client"

export function SiteHeader() {
  const pathname = usePathname()
  const [breadcrumbs, setBreadcrumbs] = useState<{ title: string; href: string }[]>([])
  const [isClient, setIsClient] = useState(false)
  const [loadedTitles, setLoadedTitles] = useState<Record<string, string>>({})
  
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
      
      // First check if we've already loaded this title from the server
      if (isUUID && loadedTitles[segment]) {
        title = loadedTitles[segment];
      }
      // Then check sessionStorage if allowed
      else if (useClientStorage && isUUID) {
        const storedName = sessionStorage.getItem(`breadcrumb_${segment}`);
        if (storedName) {
          title = storedName;
        }
      }
      
      return { title, href }
    })
    
    return breadcrumbs
  }
  
  // Fetch entity names for any UUIDs in the path
  useEffect(() => {
    const fetchEntityNames = async () => {
      const pathSegments = pathname.split('/').filter(segment => 
        segment && segment !== '(protected)'
      );
      
      const uuidSegments = pathSegments.filter(segment => 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
      );
      
      if (uuidSegments.length === 0) return;
      
      // Check which segments we need to load
      const segmentsToLoad = uuidSegments.filter(id => !loadedTitles[id]);
      if (segmentsToLoad.length === 0) return;
      
      try {
        const newTitles: Record<string, string> = {...loadedTitles};
        let updated = false;
        
        // Check for habit IDs
        if (pathname.includes('/habits/')) {
          for (const id of segmentsToLoad) {
            // Check if this ID appears after '/habits/' in the path
            if (pathname.includes(`/habits/${id}`)) {
              const { data } = await supabase
                .from('habits')
                .select('name')
                .eq('id', id)
                .single();
                
              if (data?.name) {
                newTitles[id] = data.name;
                // Also update sessionStorage for future use
                sessionStorage.setItem(`breadcrumb_${id}`, data.name);
                updated = true;
              }
            }
          }
        }
        
        // Check for goal IDs
        if (pathname.includes('/goals/')) {
          for (const id of segmentsToLoad) {
            // Check if this ID appears after '/goals/' in the path
            if (pathname.includes(`/goals/${id}`)) {
              const { data } = await supabase
                .from('goals')
                .select('title')
                .eq('id', id)
                .single();
                
              if (data?.title) {
                newTitles[id] = data.title;
                // Also update sessionStorage for future use
                sessionStorage.setItem(`breadcrumb_${id}`, data.title);
                updated = true;
              }
            }
          }
        }
        
        // Check for metric IDs
        if (pathname.includes('/metrics/')) {
          for (const id of segmentsToLoad) {
            // Check if this ID appears after '/metrics/' in the path
            if (pathname.includes(`/metrics/${id}`)) {
              const { data } = await supabase
                .from('metric_templates')
                .select('name')
                .eq('id', id)
                .single();
                
              if (data?.name) {
                newTitles[id] = data.name;
                // Also update sessionStorage for future use
                sessionStorage.setItem(`breadcrumb_${id}`, data.name);
                updated = true;
              }
            }
          }
        }
        
        // Add checks for other entity types here if needed
        
        if (updated) {
          setLoadedTitles(newTitles);
        }
      } catch (error) {
        // Silent error handling for production
        // Continue without names if fetch fails
      }
    };
    
    fetchEntityNames();
  }, [pathname]);
  
  // Update breadcrumbs whenever loadedTitles changes
  useEffect(() => {
    if (isClient) {
      setBreadcrumbs(generateBreadcrumbs(true));
    }
  }, [loadedTitles, isClient, pathname]);
  
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
        <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1 flex-shrink-0" />
            <Separator
              orientation="vertical"
              className="mx-2 data-[orientation=vertical]:h-4 flex-shrink-0"
            />
            <Breadcrumb 
              segments={generateBreadcrumbs(false)} 
              homeLink="/dashboard"
              maxItems={3}
              className="min-w-0"
            />
          </div>
          <div className="flex-shrink-0">
            <ThemeSwitcher />
          </div>
        </div>
      </header>
    )
  }
  
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-2 min-w-0">
          <SidebarTrigger className="-ml-1 flex-shrink-0" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4 flex-shrink-0"
          />
          <Breadcrumb 
            segments={breadcrumbs} 
            homeLink="/dashboard"
            maxItems={3}
            className="min-w-0"
          />
        </div>
        <div className="flex-shrink-0">
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  )
}