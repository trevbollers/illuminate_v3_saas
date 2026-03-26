"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  ClipboardList,
  DollarSign,
  BarChart2,
  MessageSquare,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  LogOut,
  CreditCard,
  User,
  Shield,
  ShoppingCart,
} from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@goparticipate/ui";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Team Management",
    items: [
      { title: "Teams", href: "/teams", icon: Shield },
      { title: "Roster", href: "/roster", icon: Users },
      { title: "Schedule", href: "/schedule", icon: Calendar },
      { title: "Attendance", href: "/attendance", icon: UserCheck },
      { title: "League Events", href: "/events", icon: ClipboardList },
      { title: "Registration Cart", href: "/registration-cart", icon: ShoppingCart },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Payments", href: "/payments", icon: DollarSign },
      { title: "Payment Settings", href: "/settings/payments", icon: CreditCard },
      { title: "Stats", href: "/stats", icon: BarChart2 },
      { title: "Communication", href: "/communication", icon: MessageSquare },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Help", href: "/help", icon: HelpCircle },
    ],
  },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatPlanName(planId: string): string {
  return planId.charAt(0).toUpperCase() + planId.slice(1) + " Plan";
}

interface SidebarUser {
  name: string;
  email: string;
  role: string;
  image: string | null;
}

interface DashboardSidebarProps {
  businessName: string;
  planName: string;
  locations: { id: string; name: string }[];
  user: SidebarUser | null;
}

export function DashboardSidebar({
  businessName,
  planName,
  locations,
  user,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  const displayName = user?.name ?? "User";
  const initials = getInitials(displayName);
  const businessInitials = getInitials(businessName);

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            {businessInitials}
          </div>
          {open && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold">
                {businessName}
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {formatPlanName(planName)}
              </span>
            </div>
          )}
        </div>
        {open && locations.length > 1 && (
          <Select defaultValue={locations[0]?.id}>
            <SelectTrigger className="mt-2 h-8 text-xs">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id} className="text-xs">
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          {open && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-md p-1 text-sm hover:bg-sidebar-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.image ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {open && (
                <>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {displayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground capitalize">
                      {user?.role ?? "staff"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{displayName}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                signOut({
                  callbackUrl:
                    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:4000",
                })
              }
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
