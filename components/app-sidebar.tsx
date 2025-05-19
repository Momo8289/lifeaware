"use client"

import * as React from "react"
import {
  ArrowUpCircleIcon,
  BarChartIcon,
  BookOpenText as BookOpenTextIcon,
  CameraIcon,
  ClipboardListIcon,
  DatabaseIcon,
  FileCodeIcon,
  FileIcon,
  FileTextIcon,
  FolderIcon,
  Gauge as GaugeIcon,
  HeartPulse,
  HelpCircleIcon,
  LayoutDashboardIcon,
  ListIcon,
  Repeat as RepeatIcon,
  SearchIcon,
  SettingsIcon,
  Target as TargetIcon,
  UsersIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { useCurrentUserName } from "@/hooks/use-current-user-name"
import { supabase } from "@/lib/supabase/client"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ThemeSwitcher } from "@/components/theme-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Habits",
      url: "/habits",
      icon: RepeatIcon,
    },
    {
      title: "Goals",
      url: "/goals",
      icon: TargetIcon,
    },
    {
      title: "Metrics",
      url: "/metrics",
      icon: GaugeIcon,
    },
    {
      title: "Journal",
      url: "/journal",
      icon: BookOpenTextIcon,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
    {
      title: "Search",
      url: "#",
      icon: SearchIcon,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [user, setUser] = React.useState<any>({
    name: "",
    email: "",
    avatar: ""
  })
  
  React.useEffect(() => {
    async function getUserData() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (authUser) {
        setUser({
          name: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
          email: authUser.email || '',
          avatar: '/avatars/shadcn.jpg' // This is just a fallback, our CurrentUserAvatar will handle the real avatar
        })
      }
    }
    
    getUserData()
  }, [])
  
  // Create a new array with isActive property set based on current path
  const navMainWithActive = React.useMemo(() => {
    return data.navMain.map(item => ({
      ...item,
      isActive: pathname === item.url
    }))
  }, [pathname])
  
  // Create navSecondary with isActive for settings pages
  const navSecondaryWithActive = React.useMemo(() => {
    return data.navSecondary.map(item => ({
      ...item,
      isActive: item.title === "Settings" 
        ? pathname === "/settings" || pathname.startsWith("/settings/") 
        : pathname === item.url
    }))
  }, [pathname])
  
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <HeartPulse className="h-5 w-5" />
                <span className="text-base font-semibold">Lifeaware</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainWithActive} />
        <NavSecondary items={navSecondaryWithActive} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
