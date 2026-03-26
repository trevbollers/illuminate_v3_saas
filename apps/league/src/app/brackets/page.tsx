export default function BracketsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brackets & Scheduling</h1>
        <p className="text-muted-foreground">
          Generate brackets, assign fields, and manage game schedules.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <h3 className="text-lg font-medium">No brackets yet</h3>
        <p className="text-muted-foreground mt-2">
          Create an event with registered teams to generate brackets and schedules.
        </p>
      </div>
    </div>
  );
}
