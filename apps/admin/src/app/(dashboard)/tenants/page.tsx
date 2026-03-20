"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, Building2, Loader2 } from "lucide-react";
import { Input } from "@illuminate/ui/src/components/input";
import { Badge } from "@illuminate/ui/src/components/badge";
import { DataTable } from "@/components/data-table";

interface Tenant {
  id: string;
  businessName: string;
  slug: string;
  owner: string;
  ownerEmail: string;
  plan: string;
  status: string;
  tenantStatus: string;
  users: number;
  created: string;
  [key: string]: unknown;
}

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "active": return "default" as const;
    case "trialing": return "secondary" as const;
    case "past_due": return "destructive" as const;
    case "suspended": return "destructive" as const;
    default: return "outline" as const;
  }
};

const planBadgeVariant = (plan: string) => {
  const lower = plan.toLowerCase();
  if (lower === "enterprise") return "default" as const;
  if (lower === "professional") return "secondary" as const;
  return "outline" as const;
};

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/tenants")
      .then((r) => r.json())
      .then((data) => setTenants(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique plan names for the filter dropdown
  const planOptions = Array.from(new Set(tenants.map((t) => t.plan))).sort();

  const filtered = tenants.filter((t) => {
    const matchSearch =
      t.businessName.toLowerCase().includes(search.toLowerCase()) ||
      t.owner.toLowerCase().includes(search.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPlan = planFilter === "all" || t.plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
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
    { key: "owner", header: "Owner", sortable: true },
    {
      key: "plan",
      header: "Plan",
      render: (row: Tenant) => (
        <Badge variant={planBadgeVariant(row.plan)} className="capitalize">
          {row.plan}
        </Badge>
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
    { key: "created", header: "Created", sortable: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="mt-1 text-muted-foreground">
            Manage all businesses on the platform
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[250px] max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, owner, or email..."
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
            <option value="canceled">Canceled</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Plans</option>
            {planOptions.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {tenants.length} tenants
          </p>
          <DataTable<Tenant>
            columns={columns}
            data={filtered}
            onRowClick={(row) => router.push(`/tenants/${row.id}`)}
            emptyMessage="No tenants found"
          />
        </>
      )}
    </div>
  );
}
