"use client";

import { useState } from "react";
import {
  Flag,
  Plus,
  Settings,
  Users,
  Percent,
  Building2,
  Tags,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@illuminate/ui/src/components/card";
import { Badge } from "@illuminate/ui/src/components/badge";
import { Button } from "@illuminate/ui/src/components/button";
import { Input } from "@illuminate/ui/src/components/input";
import { Label } from "@illuminate/ui/src/components/label";
import { Separator } from "@illuminate/ui/src/components/separator";

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutType: "all" | "percentage" | "tenant_list" | "plan_based";
  rolloutValue: string;
  updatedAt: string;
}

const initialFlags: FeatureFlag[] = [
  {
    id: "ff_1",
    name: "AI Menu Descriptions",
    key: "ai_menu_descriptions",
    description: "Generate product descriptions using AI",
    enabled: true,
    rolloutType: "plan_based",
    rolloutValue: "Professional, Enterprise",
    updatedAt: "Mar 15, 2026",
  },
  {
    id: "ff_2",
    name: "Multi-Location Support",
    key: "multi_location",
    description: "Allow tenants to manage multiple business locations",
    enabled: true,
    rolloutType: "plan_based",
    rolloutValue: "Professional, Enterprise",
    updatedAt: "Mar 10, 2026",
  },
  {
    id: "ff_3",
    name: "Advanced Analytics",
    key: "advanced_analytics",
    description: "Enhanced reporting and analytics dashboard",
    enabled: true,
    rolloutType: "percentage",
    rolloutValue: "75%",
    updatedAt: "Mar 8, 2026",
  },
  {
    id: "ff_4",
    name: "Custom Domain",
    key: "custom_domain",
    description: "Allow tenants to use their own domain for storefront",
    enabled: true,
    rolloutType: "plan_based",
    rolloutValue: "Enterprise",
    updatedAt: "Feb 28, 2026",
  },
  {
    id: "ff_5",
    name: "Beta: Table Ordering",
    key: "table_ordering",
    description: "In-restaurant QR code table ordering system",
    enabled: false,
    rolloutType: "tenant_list",
    rolloutValue: "3 tenants",
    updatedAt: "Mar 1, 2026",
  },
  {
    id: "ff_6",
    name: "Beta: Loyalty Program",
    key: "loyalty_program",
    description: "Customer loyalty points and rewards system",
    enabled: false,
    rolloutType: "percentage",
    rolloutValue: "10%",
    updatedAt: "Feb 20, 2026",
  },
  {
    id: "ff_7",
    name: "API Access",
    key: "api_access",
    description: "REST API access for third-party integrations",
    enabled: true,
    rolloutType: "plan_based",
    rolloutValue: "Enterprise",
    updatedAt: "Jan 15, 2026",
  },
];

const rolloutIcons = {
  all: Users,
  percentage: Percent,
  tenant_list: Building2,
  plan_based: Tags,
};

const rolloutLabels = {
  all: "All tenants",
  percentage: "Percentage rollout",
  tenant_list: "Specific tenants",
  plan_based: "Plan-based",
};

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function FeaturesPage() {
  const [flags, setFlags] = useState(initialFlags);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({
    name: "",
    key: "",
    description: "",
    rolloutType: "all" as FeatureFlag["rolloutType"],
  });

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleCreateFlag = () => {
    if (!newFlag.name || !newFlag.key) return;
    const flag: FeatureFlag = {
      id: `ff_${Date.now()}`,
      name: newFlag.name,
      key: newFlag.key,
      description: newFlag.description,
      enabled: false,
      rolloutType: newFlag.rolloutType,
      rolloutValue:
        newFlag.rolloutType === "all"
          ? "All tenants"
          : newFlag.rolloutType === "percentage"
            ? "0%"
            : newFlag.rolloutType === "tenant_list"
              ? "0 tenants"
              : "None",
      updatedAt: "Just now",
    };
    setFlags((prev) => [flag, ...prev]);
    setNewFlag({ name: "", key: "", description: "", rolloutType: "all" });
    setShowCreateDialog(false);
  };

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="mt-1 text-muted-foreground">
            Control feature availability across the platform &middot;{" "}
            {enabledCount} of {flags.length} enabled
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Flag
        </Button>
      </div>

      {/* Create Flag Dialog (inline) */}
      {showCreateDialog && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-base">Create Feature Flag</CardTitle>
            <CardDescription>
              Add a new feature flag to control functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="flag-name">Name</Label>
                <Input
                  id="flag-name"
                  placeholder="e.g., Beta: Reservation System"
                  value={newFlag.name}
                  onChange={(e) =>
                    setNewFlag((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flag-key">Key</Label>
                <Input
                  id="flag-key"
                  placeholder="e.g., reservation_system"
                  value={newFlag.key}
                  onChange={(e) =>
                    setNewFlag((p) => ({ ...p, key: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="flag-desc">Description</Label>
                <Input
                  id="flag-desc"
                  placeholder="What does this feature flag control?"
                  value={newFlag.description}
                  onChange={(e) =>
                    setNewFlag((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Rollout Strategy</Label>
                <select
                  value={newFlag.rolloutType}
                  onChange={(e) =>
                    setNewFlag((p) => ({
                      ...p,
                      rolloutType: e.target.value as FeatureFlag["rolloutType"],
                    }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All Tenants</option>
                  <option value="percentage">Percentage Rollout</option>
                  <option value="tenant_list">Specific Tenants</option>
                  <option value="plan_based">Plan-Based</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreateFlag}>Create Flag</Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags List */}
      <div className="space-y-3">
        {flags.map((flag) => {
          const RolloutIcon = rolloutIcons[flag.rolloutType];
          return (
            <Card key={flag.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <ToggleSwitch
                  checked={flag.enabled}
                  onChange={() => toggleFlag(flag.id)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{flag.name}</h3>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {flag.key}
                    </code>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {flag.description}
                  </p>
                </div>
                <div className="hidden items-center gap-4 text-sm sm:flex">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <RolloutIcon className="h-3.5 w-3.5" />
                    <span>{rolloutLabels[flag.rolloutType]}</span>
                    <span className="font-medium text-foreground">
                      {flag.rolloutValue}
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <span className="text-xs text-muted-foreground">
                    Updated {flag.updatedAt}
                  </span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
