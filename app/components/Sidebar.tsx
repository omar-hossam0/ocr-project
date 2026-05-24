"use client";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Search,
  Activity,
  Settings,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { useLanguage } from "@/app/lib/language-context";
import BrandLogo from "@/components/BrandLogo";
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
  SidebarRail,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/animate-ui/components/radix/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", label: "Dashboard", key: "nav.dashboard" as const, icon: LayoutDashboard },
  { href: "/upload", label: "Upload", key: "nav.upload" as const, icon: Upload },
  { href: "/search", label: "Search", key: "nav.search" as const, icon: Search },
  { href: "/tracking", label: "Tracking", key: "nav.tracking" as const, icon: Activity },
  { href: "/settings", label: "Settings", key: "nav.settings" as const, icon: Settings },
];

const AppSidebar = React.memo(function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { tr, locale } = useLanguage();

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "U";

  return (
    <Sidebar collapsible="icon">
      {/* Header — Logo */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <BrandLogo size="sm" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Nav items */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{tr("nav.navigation", "Navigation")}</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={tr(item.key, item.label)}
                    isActive={isActive}
                    className="ui-hover-lift"
                  >
                    <Link href={item.href} prefetch>
                      <item.icon />
                      <span>{tr(item.key, item.label)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="ui-hover-lift data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={user?.photoURL || undefined}
                      className="rounded-lg object-cover"
                    />
                    <AvatarFallback className="rounded-lg bg-sky-500/20 text-sky-300 text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-white">
                      {user?.name || "Account"}
                    </span>
                    <span className="truncate text-xs text-gray-400">
                      {user?.email || ""}
                    </span>
                  </div>
                  <ChevronsUpDown className={`${locale === "ar" ? "mr-auto" : "ml-auto"} size-4`} />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="ui-fade-in w-64 rounded-2xl border border-white/15 bg-[#0b1228] p-1.5 text-white shadow-2xl backdrop-blur-xl"
                side={locale === "ar" ? "left" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem
                  onClick={() => router.push("/profile")}
                  className="min-h-11 rounded-xl px-3 py-2 text-[15px] font-medium text-gray-100 focus:bg-white/10 focus:text-white whitespace-nowrap"
                >
                  <Settings className={`${locale === "ar" ? "ml-2" : "mr-2"} size-4 text-gray-300`} />
                  {tr("nav.profileSettings", "Profile & Settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    router.push("/login");
                  }}
                  className="min-h-11 rounded-xl px-3 py-2 text-[15px] font-medium text-red-400 focus:bg-red-500/15 focus:text-red-300 whitespace-nowrap"
                >
                  <LogOut className={`${locale === "ar" ? "ml-2" : "mr-2"} size-4 text-red-400`} />
                  {tr("nav.logOut", "Log out")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
});

export { AppSidebar, SidebarProvider, SidebarInset, SidebarTrigger };
export default AppSidebar;
