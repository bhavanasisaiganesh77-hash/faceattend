import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
  noPadding?: boolean;
}

export function Layout({ children, noPadding = false }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main
        className={`flex-1 ${noPadding ? "" : "py-6 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto"}`}
      >
        {children}
      </main>
      <footer className="bg-card border-t border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
      <Toaster richColors position="top-right" />
    </div>
  );
}
