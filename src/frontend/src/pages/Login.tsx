import { Role } from "@/backend";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useGetMyProfile } from "@/hooks/useProfile";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Camera, GraduationCap, ShieldCheck } from "lucide-react";

export default function Login() {
  const { isAuthenticated, isInitializing, isLoggingIn, login } = useAuth();
  const { data: profile, isFetched } = useGetMyProfile();
  const navigate = useNavigate();

  if (isAuthenticated && isFetched && profile) {
    void navigate({
      to:
        profile.role === Role.teacher
          ? "/teacher/dashboard"
          : "/student/dashboard",
    });
    return null;
  }

  if (isAuthenticated && isFetched && !profile) {
    void navigate({ to: "/setup" });
    return null;
  }

  const features = [
    {
      icon: Camera,
      title: "Real-time Face Recognition",
      desc: "AI-powered attendance marking using live camera feed",
    },
    {
      icon: ShieldCheck,
      title: "Secure & Private",
      desc: "Decentralized identity via Internet Identity \u2014 no passwords",
    },
    {
      icon: BookOpen,
      title: "Class Management",
      desc: "Teachers manage classes; students track their attendance",
    },
  ];

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-ocid="login.page"
    >
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground text-lg">
            AttendSync
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
          {/* Left: content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span
                  className="text-xs font-medium"
                  style={{ color: "oklch(var(--accent))" }}
                >
                  AI-Powered Attendance
                </span>
              </div>
              <h1 className="font-display text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                Smart Attendance
                <span
                  className="block"
                  style={{ color: "oklch(var(--primary))" }}
                >
                  Powered by AI
                </span>
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Automatically mark attendance using face recognition. No manual
                roll calls \u2014 just look at the camera.
              </p>
            </div>

            <div className="space-y-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {f.title}
                    </p>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={login}
              disabled={isInitializing || isLoggingIn}
              size="lg"
              className="w-full sm:w-auto px-8 font-semibold text-base h-12"
              data-ocid="login.login_button"
            >
              {isInitializing
                ? "Loading..."
                : isLoggingIn
                  ? "Connecting..."
                  : "Login with Internet Identity"}
            </Button>
          </div>

          {/* Right: visual card */}
          <div className="hidden md:flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
                <div
                  className="h-48 flex items-center justify-center relative"
                  style={{ background: "oklch(0.96 0.02 240)" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-2 border-primary/50 flex items-center justify-center">
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-primary-foreground font-display font-bold text-2xl"
                          style={{ background: "oklch(var(--primary))" }}
                        >
                          <Camera className="w-7 h-7" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-foreground/80 backdrop-blur-sm rounded-lg px-4 py-2">
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "oklch(var(--accent))" }}
                    >
                      Match: 98% Confidence
                    </p>
                    <div className="mt-1 h-1.5 bg-foreground/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: "98%",
                          background: "oklch(var(--accent))",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        Alice Williams
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Student ID: #2104509
                      </p>
                    </div>
                    <div
                      className="ml-auto px-2.5 py-1 rounded-full text-xs font-medium text-primary-foreground"
                      style={{ background: "oklch(var(--accent))" }}
                    >
                      Checked In
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    08:45 AM, Oct 26, 2023
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <p className="text-center text-xs text-muted-foreground">
          \u00a9 {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            caffeine.ai
          </a>
        </p>
      </footer>
    </div>
  );
}
