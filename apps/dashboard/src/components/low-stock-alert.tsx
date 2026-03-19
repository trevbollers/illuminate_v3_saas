import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@illuminate/ui";

const lowStockItems = [
  {
    name: "Beef Tenderloin",
    current: 12,
    reorderPoint: 25,
    unit: "lbs",
    severity: "critical" as const,
  },
  {
    name: "Pork Belly",
    current: 18,
    reorderPoint: 30,
    unit: "lbs",
    severity: "low" as const,
  },
  {
    name: "Lamb Rack",
    current: 8,
    reorderPoint: 15,
    unit: "lbs",
    severity: "critical" as const,
  },
  {
    name: "Hickory Wood Chips",
    current: 5,
    reorderPoint: 10,
    unit: "bags",
    severity: "low" as const,
  },
];

export function LowStockAlert() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Low Stock Alerts</CardTitle>
          <Badge variant="destructive" className="text-[10px]">
            {lowStockItems.length} items
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {lowStockItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    item.severity === "critical"
                      ? "bg-red-100 text-red-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.current} {item.unit} remaining
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  item.severity === "critical" ? "destructive" : "outline"
                }
                className="text-[10px] capitalize"
              >
                {item.severity}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
