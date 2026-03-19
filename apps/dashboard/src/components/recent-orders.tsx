import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@illuminate/ui";

const recentOrders = [
  {
    id: "SO-1024",
    customer: "Riverside Grill",
    type: "B2B" as const,
    total: "$2,450.00",
    status: "confirmed" as const,
    date: "Mar 19, 2026",
  },
  {
    id: "SO-1023",
    customer: "Sarah Mitchell",
    type: "B2C" as const,
    total: "$185.50",
    status: "processing" as const,
    date: "Mar 19, 2026",
  },
  {
    id: "SO-1022",
    customer: "The Chophouse",
    type: "B2B" as const,
    total: "$4,820.00",
    status: "shipped" as const,
    date: "Mar 18, 2026",
  },
  {
    id: "SO-1021",
    customer: "Mountain View Deli",
    type: "B2B" as const,
    total: "$1,240.00",
    status: "delivered" as const,
    date: "Mar 18, 2026",
  },
  {
    id: "SO-1020",
    customer: "James Cooper",
    type: "B2C" as const,
    total: "$92.75",
    status: "confirmed" as const,
    date: "Mar 17, 2026",
  },
];

const statusStyles: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-yellow-100 text-yellow-800 border-yellow-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function RecentOrders() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.customer}</TableCell>
                <TableCell>
                  <Badge
                    variant={order.type === "B2B" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {order.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      statusStyles[order.status] ?? ""
                    }`}
                  >
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {order.total}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
