import { Role } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useGetMyProfile } from "@/hooks/useProfile";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Scan,
  Settings,
  User,
} from "lucide-react";

const studentLinks = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/classes", label: "My Classes", icon: BookOpen },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardList },
  { href: "/student/register-face", label: "Register Face", icon: User },
];

const teacherLinks = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/classes", label: "Classes", icon: BookOpen },
  { href: "/teacher/scan", label: "Take Attendance", icon: Scan },
  { href: "/teacher/reports", label: "Reports", icon: ClipboardList },
];

export function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const { data: profile } = useGetMyProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const links = profile?.role === Role.teacher ? teacherLinks : studentLinks;
  const roleLabel = profile?.role === Role.teacher ? "Teacher" : "Student";

  if (!isAuthenticated) return null;

  return (
    <header
      className="sticky top-0 z-50 bg-card border-b border-border shadow-sm"
      data-ocid="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            data-ocid="navbar.logo_link"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground text-base tracking-tight">
              AttendSync
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  data-ocid={`navbar.${link.label.toLowerCase().replace(/ /g, "_")}_link`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {profile && (
              <Badge
                variant="outline"
                className="hidden sm:inline-flex text-xs border-primary/30 text-primary bg-primary/5"
              >
                {roleLabel}
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 h-9 px-2"
                  data-ocid="navbar.user_menu_button"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                    {profile?.faceImageUrl ? (
                      <img
                        src={profile.faceImageUrl}
                        alt={profile.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground">
                    {profile?.name ?? "Profile"}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-44"
                data-ocid="navbar.user_dropdown"
              >
                <DropdownMenuItem asChild>
                  <Link
                    to="/settings"
                    data-ocid="navbar.settings_link"
                    className="flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
                  data-ocid="navbar.logout_button"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="flex overflow-x-auto px-4 py-2 gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`flex flex-col items-center gap-1 min-w-[60px] px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
