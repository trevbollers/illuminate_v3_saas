import { type LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@goparticipate/ui/src/components/card";
import { cn } from "@goparticipate/ui/src/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(change || description) && (
          <p className="mt-1 text-xs text-muted-foreground">
            {change && (
              <span
                className={cn(
                  "font-medium",
                  changeType === "positive" && "text-emerald-600",
                  changeType === "negative" && "text-red-600"
                )}
              >
                {change}
              </span>
            )}
            {change && description && " "}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
