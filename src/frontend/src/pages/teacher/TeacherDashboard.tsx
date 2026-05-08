import { Role } from "@/backend";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyProfile } from "@/hooks/useProfile";
import {
  useCreateClass,
  useGetClassAttendance,
  useListClasses,
  useListStudents,
} from "@/hooks/useQueries";
import type { Class } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ClassSummaryCard({ cls, index }: { cls: Class; index: number }) {
  const todayKey = getTodayKey();
  const { data: attendance = [] } = useGetClassAttendance(cls.id, todayKey);
  const presentCount = attendance.length;
  const totalStudents = cls.studentIds.length;
  const rate =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <Link to="/teacher/classes" data-ocid={`dashboard.class_card.${index}`}>
      <Card className="border-border hover:shadow-md hover:border-primary/30 transition-smooth cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-smooth" />
          </div>
          <h3 className="font-display font-semibold text-foreground text-sm mb-1 truncate">
            {cls.name}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {totalStudents} student{totalStudents !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-smooth"
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {rate}%
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-xs border-accent/40 text-accent bg-accent/10 gap-1 py-0"
            >
              <CheckCircle2 className="w-3 h-3" />
              {presentCount} today
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CreateClassDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createClass = useCreateClass();

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createClass.mutateAsync(name.trim());
      toast.success(`Class "${name.trim()}" created!`);
      setName("");
      setOpen(false);
      onCreated?.();
    } catch {
      toast.error("Failed to create class. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-ocid="dashboard.create_class_button">
          <Plus className="w-4 h-4 mr-1.5" />
          New Class
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="dashboard.create_class_dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Create New Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label
              htmlFor="class-name"
              className="text-sm font-medium text-foreground"
            >
              Class Name
            </label>
            <Input
              id="class-name"
              placeholder="e.g., Advanced Mathematics – Sec A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              data-ocid="dashboard.class_name_input"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="dashboard.create_class_cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={!name.trim() || createClass.isPending}
              data-ocid="dashboard.create_class_submit_button"
            >
              {createClass.isPending ? "Creating…" : "Create Class"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DashboardContent() {
  const { data: profile } = useGetMyProfile();
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: students = [] } = useListStudents();
  const todayKey = getTodayKey();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Layout>
      <div className="space-y-8" data-ocid="teacher_dashboard.page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{today}</p>
            <h1 className="font-display text-2xl font-bold text-foreground mt-0.5">
              {greeting}, {profile?.name?.split(" ")[0] ?? "Professor"} 👋
            </h1>
          </div>
          <CreateClassDialog />
        </div>

        {/* Stats strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          data-ocid="dashboard.stats_section"
        >
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground leading-none">
                    {classesLoading ? (
                      <Skeleton className="h-7 w-8" />
                    ) : (
                      classes.length
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Classes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Users className="w-4.5 h-4.5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground leading-none">
                    {students.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border col-span-2 sm:col-span-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground leading-none">
                    {todayKey}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes grid */}
        <div data-ocid="dashboard.classes_section">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Your Classes
            </h2>
            <Link
              to="/teacher/classes"
              className="text-sm text-primary hover:underline"
              data-ocid="dashboard.view_all_classes_link"
            >
              View all
            </Link>
          </div>

          {classesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
              <Skeleton className="h-36 rounded-xl" />
            </div>
          ) : classes.length === 0 ? (
            <Card
              className="border-dashed border-2 border-border"
              data-ocid="dashboard.classes_empty_state"
            >
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <GraduationCap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  No classes yet
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  Create your first class and start tracking attendance.
                </p>
                <CreateClassDialog />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls, i) => (
                <ClassSummaryCard
                  key={cls.id.toString()}
                  cls={cls}
                  index={i + 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div data-ocid="dashboard.quick_actions_section">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                href: "/teacher/classes",
                icon: BookOpen,
                label: "Manage Classes",
              },
              {
                href: "/teacher/scan",
                icon: GraduationCap,
                label: "Take Attendance",
              },
              {
                href: "/teacher/reports",
                icon: TrendingUp,
                label: "View Reports",
              },
              { href: "/settings", icon: Users, label: "Settings" },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  to={action.href}
                  data-ocid={`dashboard.quick_action.${i + 1}`}
                >
                  <Card className="border-border hover:shadow-md hover:border-primary/30 transition-smooth cursor-pointer group">
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <div className="w-9 h-9 rounded-lg bg-muted group-hover:bg-primary/10 transition-smooth flex items-center justify-center">
                        <Icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-smooth" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-smooth">
                        {action.label}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function TeacherDashboard() {
  return (
    <ProtectedRoute requiredRole={Role.teacher}>
      <DashboardContent />
    </ProtectedRoute>
  );
}
