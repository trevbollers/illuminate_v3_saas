"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  Warehouse,
  Factory,
  ShoppingCart,
  Truck,
  Users,
  UserCog,
  MapPin,
  Store,
  Settings,
  HelpCircle,
  ChevronsUpDown,
  LogOut,
  CreditCard,
  User,
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
  Separator,
} from "@illuminate/ui";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Products", href: "/products", icon: Package },
      { title: "Recipes", href: "/recipes", icon: ChefHat },
      { title: "Inventory", href: "/inventory", icon: Warehouse },
      { title: "Production", href: "/production", icon: Factory },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Sales Orders", href: "/sales", icon: ShoppingCart },
      { title: "Purchasing", href: "/purchasing", icon: Truck },
      { title: "Suppliers", href: "/suppliers", icon: Users },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Team", href: "/team", icon: UserCog },
      { title: "Locations", href: "/locations", icon: MapPin },
      { title: "Storefront", href: "/storefront", icon: Store },
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

const mockLocations = [
  { id: "loc-1", name: "Main Processing Facility" },
  { id: "loc-2", name: "Downtown Retail Shop" },
];

const mockUser = {
  name: "Mike Johnson",
  email: "mike@premiummeats.com",
  role: "Owner",
  avatar: null,
  initials: "MJ",
};

export function DashboardSidebar() {
  const pathname = usePathname();
  const { open } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            PM
          </div>
          {open && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold">
                Premium Meats Co.
              </span>
              <span className="truncate text-xs text-muted-foreground">
                Pro Plan
              </span>
            </div>
          )}
        </div>
        {open && mockLocations.length > 1 && (
          <Select defaultValue={mockLocations[0]?.id}>
            <SelectTrigger className="mt-2 h-8 text-xs">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              {mockLocations.map((loc) => (
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
                <AvatarImage src={mockUser.avatar ?? undefined} />
                <AvatarFallback className="text-xs">
                  {mockUser.initials}
                </AvatarFallback>
              </Avatar>
              {open && (
                <>
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="truncate text-sm font-medium">
                      {mockUser.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {mockUser.role}
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
                <span>{mockUser.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {mockUser.email}
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
            <DropdownMenuItem className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
