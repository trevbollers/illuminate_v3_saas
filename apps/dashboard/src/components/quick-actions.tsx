"use client";

import Link from "next/link";
import { UserPlus, CalendarPlus, MessageSquarePlus, DollarSign, ClipboardList, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@goparticipate/ui";

const actions = [
  {
    title: "Add Player",
    description: "Add a player to the roster",
    href: "/roster/new",
    icon: UserPlus,
    color: "bg-blue-100 text-blue-600",
  },
  {
    title: "Create Event",
    description: "Schedule a game or practice",
    href: "/schedule/new",
    icon: CalendarPlus,
    color: "bg-emerald-100 text-emerald-600",
  },
  {
    title: "Send Message",
    description: "Message your team or parents",
    href: "/communication/new",
    icon: MessageSquarePlus,
    color: "bg-amber-100 text-amber-600",
  },
  {
    title: "Collect Payment",
    description: "Request dues or event fees",
    href: "/payments/new",
    icon: DollarSign,
    color: "bg-purple-100 text-purple-600",
  },
  {
    title: "Take Attendance",
    description: "Record practice or game attendance",
    href: "/attendance/new",
    icon: ClipboardList,
    color: "bg-pink-100 text-pink-600",
  },
  {
    title: "Log Stats",
    description: "Enter game stats and results",
    href: "/stats/new",
    icon: BarChart2,
    color: "bg-indigo-100 text-indigo-600",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-accent"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}
              >
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary">
                  {action.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
