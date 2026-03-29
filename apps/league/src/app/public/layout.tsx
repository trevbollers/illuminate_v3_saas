/**
 * Layout for public (unauthenticated) pages.
 * Renders children directly without the league sidebar.
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
