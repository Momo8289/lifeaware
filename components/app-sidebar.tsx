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
  BellIcon,
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
      title: "Reminders",
      url: "/reminders",
      icon: BellIcon,
      badge: "0",
    },
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
  const [reminderCount, setReminderCount] = React.useState<number>(0)
  
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
  
  // Fetch the count of active reminders
  React.useEffect(() => {
    const fetchReminderCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { count, error } = await supabase
          .from('reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');
        
        if (error) throw error;
        setReminderCount(count || 0);
      } catch (error) {
        console.error('Error fetching reminder count:', error);
      }
    };

    fetchReminderCount();
    
    // Listen for the custom refresh event
    const handleRefreshReminders = () => {
      fetchReminderCount();
    };
    
    window.addEventListener('refresh-reminders', handleRefreshReminders);

    // Set up a subscription to keep the count updated
    const channel = supabase
      .channel('reminder-count-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'reminders',
          filter: 'status=eq.active'
        }, 
        () => fetchReminderCount()
      )
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'reminders'
        }, 
        () => fetchReminderCount()
      )
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'reminders'
        }, 
        () => fetchReminderCount()
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.error('Failed to subscribe to reminder changes:', status);
        }
      });

    // Manually refresh every 30 seconds as a fallback
    const intervalId = setInterval(fetchReminderCount, 30000);

    return () => {
      window.removeEventListener('refresh-reminders', handleRefreshReminders);
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Create a new array with isActive property set based on current path
  const navMainWithActive = React.useMemo(() => {
    return data.navMain.map(item => ({
      ...item,
      isActive: item.title === "Habits" 
        ? pathname === item.url || pathname.startsWith(`${item.url}/`)
        : pathname === item.url
    }))
  }, [pathname])
  
  // Create navSecondary with isActive for settings pages and update reminder badge
  const navSecondaryWithActive = React.useMemo(() => {
    return data.navSecondary.map(item => {
      if (item.title === "Reminders") {
        return {
          ...item,
          badge: reminderCount.toString(),
          isActive: pathname === item.url || pathname.startsWith(`${item.url}/`)
        };
      }
      
      return {
        ...item,
        isActive: item.title === "Settings" 
          ? pathname === "/settings" || pathname.startsWith("/settings/") 
          : pathname === item.url
      };
    });
  }, [pathname, reminderCount]);
  
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
