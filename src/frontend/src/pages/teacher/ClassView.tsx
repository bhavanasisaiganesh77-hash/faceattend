import { Role } from "@/backend";
import { AttendanceTable } from "@/components/AttendanceTable";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetClassAttendance,
  useListClasses,
  useListStudents,
  useMarkAttendance,
} from "@/hooks/useQueries";
import type { Class, ClassId, Profile } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

interface ClassDetailProps {
  cls: Class;
  allStudents: Profile[];
}

function ClassDetail({ cls, allStudents }: ClassDetailProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const markAttendance = useMarkAttendance();

  const enrolledStudents = useMemo(() => {
    const ids = new Set(cls.studentIds.map((id) => id.toText()));
    return allStudents.filter((s) => ids.has(s.id.toText()));
  }, [cls.studentIds, allStudents]);

  const currentDateKey = dateKey(selectedDate);
  const { data: attendanceRecords = [], isLoading: attendanceLoading } =
    useGetClassAttendance(cls.id, currentDateKey);

  const isToday = dateKey(new Date()) === currentDateKey;
  const isFuture = selectedDate > new Date() && !isToday;

  const _handleMarkPresent = async (studentId: string) => {
    try {
      await markAttendance.mutateAsync({
        classId: cls.id,
        studentId,
        confidence: 1.0,
      });
      toast.success("Attendance marked successfully.");
    } catch {
      toast.error("Failed to mark attendance.");
    }
  };

  const displayDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Class header */}
      <Card className="border-border bg-card">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold text-foreground">
                {cls.name}
              </h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {enrolledStudents.length} enrolled
                </span>
                <Badge
                  variant="outline"
                  className="text-xs border-primary/30 text-primary bg-primary/5"
                >
                  ID #{cls.id.toString()}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date navigator */}
      <Card className="border-border" data-ocid="class_view.date_picker">
        <CardHeader className="py-3 px-5 border-b border-border">
          <CardTitle className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Attendance Date
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => addDays(d, -1))}
              data-ocid="class_view.prev_day_button"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="flex-1 text-center">
              <p className="font-display font-semibold text-foreground text-sm">
                {displayDate}
              </p>
              {isToday && (
                <Badge
                  variant="outline"
                  className="text-xs border-accent/40 text-accent bg-accent/10 mt-1"
                >
                  Today
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedDate((d) => addDays(d, 1))}
              disabled={isToday}
              data-ocid="class_view.next_day_button"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Date quick-pick */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            {[-6, -5, -4, -3, -2, -1, 0].map((offset) => {
              const d = addDays(new Date(), offset);
              const dk = dateKey(d);
              const isSelected = dk === currentDateKey;
              return (
                <button
                  key={dk}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-smooth border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                  data-ocid={`class_view.date_button.${Math.abs(offset)}`}
                >
                  <span className="text-[10px] uppercase">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span>{d.getDate()}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance table */}
      <Card className="border-border" data-ocid="class_view.attendance_section">
        <CardHeader className="py-3 px-5 border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-display font-semibold text-foreground">
              Attendance — {currentDateKey}
            </CardTitle>
            {isToday && (
              <Link to="/teacher/scan">
                <Button
                  size="sm"
                  variant="outline"
                  data-ocid="class_view.take_attendance_button"
                >
                  Take Attendance
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {isFuture ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-ocid="class_view.future_date_state"
            >
              <CalendarDays className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No records for future dates.
              </p>
            </div>
          ) : (
            <AttendanceTable
              students={enrolledStudents}
              attendanceRecords={
                isToday ? attendanceRecords : attendanceRecords
              }
              isLoading={attendanceLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClassViewContent() {
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: students = [], isLoading: studentsLoading } = useListStudents();
  const [selectedClassId, setSelectedClassId] = useState<ClassId | null>(null);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId) ?? null;
  const isLoading = classesLoading || studentsLoading;

  return (
    <Layout>
      <div className="space-y-6" data-ocid="class_view.page">
        {/* Back + heading */}
        <div className="flex items-center gap-3">
          <Link to="/teacher/dashboard" data-ocid="class_view.back_link">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div className="w-px h-4 bg-border" />
          <h1 className="font-display text-xl font-bold text-foreground">
            Classes
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Class list sidebar */}
          <div className="space-y-3" data-ocid="class_view.class_list">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {classes.length} class{classes.length !== 1 ? "es" : ""}
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : classes.length === 0 ? (
              <Card
                className="border-dashed border-2"
                data-ocid="class_view.classes_empty_state"
              >
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No classes found.
                  </p>
                  <Link to="/teacher/dashboard" className="mt-3">
                    <Button size="sm" variant="outline">
                      Create one
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {classes.map((cls, i) => (
                  <button
                    key={cls.id.toString()}
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-smooth ${
                      selectedClassId === cls.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50"
                    }`}
                    data-ocid={`class_view.class_item.${i + 1}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <BookOpen className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {cls.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cls.studentIds.length} student
                          {cls.studentIds.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div>
            {selectedClass ? (
              <ClassDetail cls={selectedClass} allStudents={students} />
            ) : !isLoading && classes.length > 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  Select a class to view attendance.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function ClassView() {
  return (
    <ProtectedRoute requiredRole={Role.teacher}>
      <ClassViewContent />
    </ProtectedRoute>
  );
}
