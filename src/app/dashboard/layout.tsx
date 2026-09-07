export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main className="min-h-screen">{children}</main>
      </body>
    </html>
  );
}