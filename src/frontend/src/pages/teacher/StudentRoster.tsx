import { Role } from "@/backend";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudentCard } from "@/components/StudentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetClassAttendance,
  useListClasses,
  useListStudents,
  useMarkAttendance,
} from "@/hooks/useQueries";
import type { ClassId, Profile } from "@/types";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface RosterContentProps {
  selectedClassId: ClassId | null;
  students: Profile[];
}

function RosterContent({ selectedClassId, students }: RosterContentProps) {
  const todayKey = getTodayKey();
  const { data: attendance = [], isLoading: attendanceLoading } =
    useGetClassAttendance(selectedClassId, todayKey);
  const markAttendance = useMarkAttendance();
  const [search, setSearch] = useState("");

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, (typeof attendance)[0]>();
    for (const r of attendance) map.set(r.studentId.toText(), r);
    return map;
  }, [attendance]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.id.toText().toLowerCase().includes(q),
    );
  }, [students, search]);

  const presentCount = attendance.length;
  const absentCount = students.length - presentCount;

  const handleMarkPresent = async (studentId: string) => {
    if (!selectedClassId) return;
    try {
      await markAttendance.mutateAsync({
        classId: selectedClassId,
        studentId,
        confidence: 1.0,
      });
      toast.success("Attendance marked manually.");
    } catch {
      toast.error("Failed to mark attendance.");
    }
  };

  if (attendanceLoading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        data-ocid="roster.loading_state"
      >
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary badges */}
      <div
        className="flex items-center gap-3 flex-wrap"
        data-ocid="roster.summary"
      >
        <Badge
          variant="outline"
          className="border-border text-muted-foreground gap-1.5"
        >
          <Users className="w-3.5 h-3.5" />
          {students.length} enrolled
        </Badge>
        <Badge
          variant="outline"
          className="border-accent/40 text-accent bg-accent/10 gap-1.5"
        >
          ✓ {presentCount} present
        </Badge>
        {absentCount > 0 && (
          <Badge
            variant="outline"
            className="border-muted-foreground/30 text-muted-foreground gap-1.5"
          >
            ✗ {absentCount} absent
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search students…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          data-ocid="roster.search_input"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2" data-ocid="roster.empty_state">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="w-8 h-8 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">
              {search ? "No matching students" : "No students enrolled"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Try a different search term."
                : "Students will appear here once they join the class."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          data-ocid="roster.student_list"
        >
          {filtered.map((student, i) => (
            <StudentCard
              key={student.id.toText()}
              profile={student}
              attendanceRecord={attendanceByStudent.get(student.id.toText())}
              classId={selectedClassId ?? undefined}
              onMarkPresent={handleMarkPresent}
              isMarkingLoading={markAttendance.isPending}
              index={i + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentRosterContent() {
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: students = [], isLoading: studentsLoading } = useListStudents();
  const [selectedClassId, setSelectedClassId] = useState<ClassId | null>(null);

  const effectiveClassId: ClassId | null =
    selectedClassId ?? (classes.length > 0 ? classes[0].id : null);

  const selectedClass = classes.find((c) => c.id === effectiveClassId) ?? null;

  const enrolledStudents = useMemo(() => {
    if (!selectedClass) return students;
    const ids = new Set(selectedClass.studentIds.map((id) => id.toText()));
    return students.filter((s) => ids.has(s.id.toText()));
  }, [selectedClass, students]);

  const isLoading = classesLoading || studentsLoading;

  return (
    <Layout>
      <div className="space-y-6" data-ocid="roster.page">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/teacher/dashboard" data-ocid="roster.back_link">
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div className="w-px h-4 bg-border" />
          <h1 className="font-display text-xl font-bold text-foreground">
            Student Roster
          </h1>
        </div>

        {/* Class filter tabs */}
        {classes.length > 0 && (
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1"
            data-ocid="roster.class_filter"
          >
            <button
              type="button"
              onClick={() => setSelectedClassId(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth whitespace-nowrap ${
                effectiveClassId === (classes[0]?.id ?? null) &&
                !selectedClassId
                  ? ""
                  : selectedClassId === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              } ${selectedClassId === null && classes.length > 0 ? "bg-muted/60 border-border text-foreground" : ""}`}
              data-ocid="roster.filter_all"
            >
              <Users className="w-3 h-3" />
              All Students ({students.length})
            </button>
            {classes.map((cls, i) => (
              <button
                key={cls.id.toString()}
                type="button"
                onClick={() => setSelectedClassId(cls.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth whitespace-nowrap ${
                  effectiveClassId === cls.id && selectedClassId !== null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
                data-ocid={`roster.class_tab.${i + 1}`}
              >
                <BookOpen className="w-3 h-3" />
                {cls.name} ({cls.studentIds.length})
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            data-ocid="roster.loading_state"
          >
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <RosterContent
            selectedClassId={
              selectedClassId ?? (classes.length > 0 ? classes[0].id : null)
            }
            students={selectedClassId !== null ? enrolledStudents : students}
          />
        )}
      </div>
    </Layout>
  );
}

export default function StudentRoster() {
  return (
    <ProtectedRoute requiredRole={Role.teacher}>
      <StudentRosterContent />
    </ProtectedRoute>
  );
}
