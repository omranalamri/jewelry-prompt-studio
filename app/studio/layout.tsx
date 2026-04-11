import Link from 'next/link';
import { Sparkles, Home, FolderOpen, History, DollarSign, Palette, Gem, Brain, Cpu, Telescope, Compass } from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b glass">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg gold-gradient flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight hidden sm:inline">
              <span className="gold-gradient-text">Prompt</span> Studio
            </span>
          </Link>
          <nav className="flex items-center gap-0.5">
            {[
              { href: '/studio', icon: Home, label: 'Studio' },
              { href: '/studio/tryon', icon: Gem, label: 'Try-On' },
              { href: '/studio/repository', icon: FolderOpen, label: 'Repo' },
              { href: '/studio/brand', icon: Palette, label: 'Brand' },
              { href: '/studio/costs', icon: DollarSign, label: 'Costs' },
              { href: '/studio/learn', icon: Brain, label: 'Learn' },
              { href: '/studio/models', icon: Cpu, label: 'Models' },
              { href: '/studio/research', icon: Telescope, label: 'Research' },
              { href: '/studio/strategy', icon: Compass, label: 'Strategy' },
              { href: '/studio/history', icon: History, label: 'History' },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-accent">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            <div className="ml-1 border-l pl-1">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        {children}
      </main>
      <footer className="border-t py-6 px-4">
        <div className="container mx-auto flex items-center justify-between max-w-4xl">
          <span className="text-xs text-muted-foreground">Jewelry Prompt Studio</span>
          <span className="text-xs text-muted-foreground">Powered by Claude AI</span>
        </div>
      </footer>
    </div>
  );
}
