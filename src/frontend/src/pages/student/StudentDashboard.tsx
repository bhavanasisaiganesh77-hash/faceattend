import { Role } from "@/backend";
import {
  AttendanceStatus,
  TodayAttendanceCard,
} from "@/components/AttendanceStatus";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useGetMyProfile } from "@/hooks/useProfile";
import {
  useGetMyAttendance,
  useJoinClass,
  useListClasses,
} from "@/hooks/useQueries";
import type { Class } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  PlusCircle,
  TrendingUp,
  User,
} from "lucide-react";
import { toast } from "sonner";

function ClassCard({
  cls,
  isEnrolled,
  onJoin,
  joining,
}: {
  cls: Class;
  isEnrolled: boolean;
  onJoin: (id: bigint) => void;
  joining: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors"
      data-ocid={`student_classes.class_card.${cls.id.toString()}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-sm text-foreground">{cls.name}</p>
          <p className="text-xs text-muted-foreground">
            {cls.studentIds.length} students
          </p>
        </div>
      </div>
      {isEnrolled ? (
        <Badge
          variant="outline"
          className="text-xs border-accent/30 text-accent bg-accent/5"
        >
          <CheckCircle2 className="w-3 h-3 mr-1" /> Enrolled
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onJoin(cls.id)}
          disabled={joining}
          data-ocid={`student_classes.join_button.${cls.id.toString()}`}
        >
          <PlusCircle className="w-3.5 h-3.5 mr-1" />
          Join
        </Button>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { currentPrincipal } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: attendance = [], isLoading: attendanceLoading } =
    useGetMyAttendance();
  const joinClass = useJoinClass();

  const myClasses = classes.filter((c) =>
    currentPrincipal
      ? c.studentIds.some(
          (sid) => sid.toString() === currentPrincipal.toString(),
        )
      : false,
  );
  const availableClasses = classes.filter(
    (c) => !myClasses.some((mc) => mc.id === c.id),
  );

  const totalClasses = myClasses.length;
  const totalPresent = new Set(
    attendance.map((r) => `${r.dateKey}-${r.classId.toString()}`),
  ).size;
  const attendanceRate =
    totalClasses > 0
      ? Math.round((totalPresent / Math.max(totalClasses, 1)) * 100)
      : 0;

  const handleJoin = (classId: bigint) => {
    joinClass.mutate(classId, {
      onSuccess: (success) => {
        if (success) toast.success("Joined class successfully!");
        else toast.error("Could not join class.");
      },
      onError: () => toast.error("Failed to join class."),
    });
  };

  return (
    <ProtectedRoute requiredRole={Role.student}>
      <Layout>
        <div className="space-y-6" data-ocid="student_dashboard.page">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {profileLoading ? (
                <Skeleton className="h-7 w-48 mb-1" />
              ) : (
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Welcome back, {profile?.name?.split(" ")[0] ?? "Student"} 👋
                </h1>
              )}
              <p className="text-muted-foreground text-sm mt-0.5">
                Here's your attendance overview for today.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                data-ocid="student_dashboard.register_face_button"
              >
                <Link to="/student/register-face">
                  <User className="w-4 h-4 mr-1.5" />
                  Register Face
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                data-ocid="student_dashboard.take_attendance_button"
              >
                <Link to="/student/attendance">
                  <Camera className="w-4 h-4 mr-1.5" />
                  Mark Attendance
                </Link>
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card data-ocid="student_dashboard.enrolled_card">
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Enrolled Classes
                </p>
                {classesLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="font-display text-3xl font-bold text-foreground mt-1">
                    {totalClasses}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card data-ocid="student_dashboard.sessions_card">
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Sessions Attended
                </p>
                {attendanceLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="font-display text-3xl font-bold text-foreground mt-1">
                    {attendance.length}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card
              className="col-span-2 sm:col-span-1"
              data-ocid="student_dashboard.rate_card"
            >
              <CardContent className="pt-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Overall Rate
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {attendanceLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="font-display text-3xl font-bold text-accent">
                        {attendanceRate}%
                      </p>
                      <TrendingUp className="w-4 h-4 text-accent" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's attendance */}
            <div className="space-y-4">
              <TodayAttendanceCard records={attendance} classes={myClasses} />

              <Card data-ocid="student_dashboard.history_card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    Attendance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <AttendanceStatus
                      records={attendance}
                      classes={myClasses}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Classes */}
            <div className="space-y-4">
              {/* Enrolled */}
              <Card data-ocid="student_dashboard.my_classes_card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">
                    My Classes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {classesLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : myClasses.length === 0 ? (
                    <div
                      className="flex flex-col items-center py-6 gap-2 text-center"
                      data-ocid="student_dashboard.my_classes.empty_state"
                    >
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        You haven't joined any classes yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myClasses.map((cls) => (
                        <ClassCard
                          key={cls.id.toString()}
                          cls={cls}
                          isEnrolled={true}
                          onJoin={handleJoin}
                          joining={joinClass.isPending}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Available */}
              {availableClasses.length > 0 && (
                <Card data-ocid="student_dashboard.available_classes_card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">
                      Join a Class
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {availableClasses.slice(0, 5).map((cls) => (
                        <ClassCard
                          key={cls.id.toString()}
                          cls={cls}
                          isEnrolled={false}
                          onJoin={handleJoin}
                          joining={joinClass.isPending}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
