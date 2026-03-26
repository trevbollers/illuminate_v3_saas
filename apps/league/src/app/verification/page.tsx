export default function VerificationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Age Verification</h1>
        <p className="text-muted-foreground">
          Review and approve player age verification documents.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-12 text-center">
        <h3 className="text-lg font-medium">No pending verifications</h3>
        <p className="text-muted-foreground mt-2">
          Player verification requests that need manual review will appear here.
        </p>
      </div>
    </div>
  );
}
