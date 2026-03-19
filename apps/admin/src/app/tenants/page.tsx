"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Building2, Plus } from "lucide-react";
import { Input } from "@illuminate/ui/src/components/input";
import { Button } from "@illuminate/ui/src/components/button";
import { Badge } from "@illuminate/ui/src/components/badge";
import { DataTable } from "@/components/data-table";

interface Tenant {
  id: string;
  businessName: string;
  owner: string;
  ownerEmail: string;
  plan: string;
  status: string;
  users: number;
  created: string;
  [key: string]: unknown;
}

const mockTenants: Tenant[] = [
  {
    id: "t_1",
    businessName: "Coastal Coffee Co.",
    owner: "Sarah Mitchell",
    ownerEmail: "sarah@coastalcoffee.com",
    plan: "Professional",
    status: "active",
    users: 8,
    created: "Jan 12, 2026",
  },
  {
    id: "t_2",
    businessName: "Urban Bites",
    owner: "James Chen",
    ownerEmail: "james@urbanbites.com",
    plan: "Starter",
    status: "active",
    users: 3,
    created: "Feb 3, 2026",
  },
  {
    id: "t_3",
    businessName: "Fresh & Local Market",
    owner: "Maria Rodriguez",
    ownerEmail: "maria@freshandlocal.com",
    plan: "Enterprise",
    status: "active",
    users: 24,
    created: "Nov 8, 2025",
  },
  {
    id: "t_4",
    businessName: "The Daily Grind",
    owner: "Tom Baker",
    ownerEmail: "tom@dailygrind.com",
    plan: "Professional",
    status: "trialing",
    users: 5,
    created: "Mar 10, 2026",
  },
  {
    id: "t_5",
    businessName: "Sakura Sushi Bar",
    owner: "Yuki Tanaka",
    ownerEmail: "yuki@sakurasushi.com",
    plan: "Starter",
    status: "active",
    users: 2,
    created: "Dec 22, 2025",
  },
  {
    id: "t_6",
    businessName: "Mountain View Bakery",
    owner: "Lisa Park",
    ownerEmail: "lisa@mountainviewbakery.com",
    plan: "Professional",
    status: "past_due",
    users: 6,
    created: "Sep 15, 2025",
  },
  {
    id: "t_7",
    businessName: "Green Leaf Bistro",
    owner: "David Kumar",
    ownerEmail: "david@greenleafbistro.com",
    plan: "Starter",
    status: "suspended",
    users: 1,
    created: "Jul 4, 2025",
  },
  {
    id: "t_8",
    businessName: "Harbor Fish Market",
    owner: "Mike O'Brien",
    ownerEmail: "mike@harborfish.com",
    plan: "Enterprise",
    status: "active",
    users: 18,
    created: "Aug 20, 2025",
  },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default" as const;
    case "trialing":
      return "secondary" as const;
    case "past_due":
      return "destructive" as const;
    case "suspended":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const planBadgeVariant = (plan: string) => {
  switch (plan) {
    case "Enterprise":
      return "default" as const;
    case "Professional":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
};

export default function TenantsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  const filteredTenants = mockTenants.filter((t) => {
    const matchesSearch =
      t.businessName.toLowerCase().includes(search.toLowerCase()) ||
      t.owner.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || t.status === statusFilter;
    const matchesPlan = planFilter === "all" || t.plan === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const columns = [
    {
      key: "businessName",
      header: "Business Name",
      sortable: true,
      render: (row: Tenant) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.businessName}</p>
            <p className="text-xs text-muted-foreground">{row.ownerEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortable: true,
    },
    {
      key: "plan",
      header: "Plan",
      render: (row: Tenant) => (
        <Badge variant={planBadgeVariant(row.plan)}>{row.plan}</Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Tenant) => (
        <Badge variant={statusBadgeVariant(row.status)}>
          {row.status.replace("_", " ")}
        </Badge>
      ),
    },
    {
      key: "users",
      header: "Users",
      render: (row: Tenant) => <span>{row.users}</span>,
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all businesses on the platform
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Professional">Professional</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredTenants.length} of {mockTenants.length} tenants
      </p>

      {/* Table */}
      <DataTable<Tenant>
        columns={columns}
        data={filteredTenants}
        onRowClick={(row) => router.push(`/tenants/${row.id}`)}
      />
    </div>
  );
}
