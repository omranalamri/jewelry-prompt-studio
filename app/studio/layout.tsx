import Link from 'next/link';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/studio" className="font-semibold text-lg">
            Jewelry Prompt Studio
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/studio"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Studio
            </Link>
            <Link
              href="/studio/history"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              History
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>
    </div>
  );
}
