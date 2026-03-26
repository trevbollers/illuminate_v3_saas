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
} from "@goparticipate/ui";

const recentActivity = [
  {
    id: "act-1",
    description: "Marcus Johnson added to roster",
    team: "U14 Varsity",
    type: "Roster" as const,
    date: "Mar 22, 2026",
  },
  {
    id: "act-2",
    description: "Spring Showcase payment collected",
    team: "KC Thunder",
    type: "Payment" as const,
    date: "Mar 21, 2026",
  },
  {
    id: "act-3",
    description: "Practice scheduled — Thursday 6pm",
    team: "U12 Junior",
    type: "Schedule" as const,
    date: "Mar 21, 2026",
  },
  {
    id: "act-4",
    description: "Game recap sent to parents",
    team: "U14 Varsity",
    type: "Message" as const,
    date: "Mar 20, 2026",
  },
  {
    id: "act-5",
    description: "Attendance recorded — 14/16 present",
    team: "U12 Junior",
    type: "Attendance" as const,
    date: "Mar 19, 2026",
  },
];

const typeStyles: Record<string, string> = {
  Roster: "bg-blue-100 text-blue-800 border-blue-200",
  Payment: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Schedule: "bg-purple-100 text-purple-800 border-purple-200",
  Message: "bg-amber-100 text-amber-800 border-amber-200",
  Attendance: "bg-pink-100 text-pink-800 border-pink-200",
};

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Activity</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentActivity.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell className="text-muted-foreground">{item.team}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      typeStyles[item.type] ?? ""
                    }`}
                  >
                    {item.type}
                  </span>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {item.date}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
