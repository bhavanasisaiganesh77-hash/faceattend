import { Role } from "@/backend";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import SetupProfile from "@/pages/SetupProfile";
import AttendanceCapture from "@/pages/student/AttendanceCapture";
import FaceRegister from "@/pages/student/FaceRegister";
import StudentDashboard from "@/pages/student/StudentDashboard";
import StudentQRCheckin from "@/pages/student/StudentQRCheckin";
import AttendanceAnalytics from "@/pages/teacher/AttendanceAnalytics";
import ClassView from "@/pages/teacher/ClassView";
import StudentRoster from "@/pages/teacher/StudentRoster";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import TeacherQRSession from "@/pages/teacher/TeacherQRSession";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

function PlaceholderPage({
  title,
  description,
}: { title: string; description: string }) {
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </Layout>
  );
}

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupProfile,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => null,
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});

const teacherDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teacher/dashboard",
  component: TeacherDashboard,
});

const teacherClassesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teacher/classes",
  component: ClassView,
});

const teacherScanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teacher/scan",
  component: TeacherQRSession,
});

const teacherReportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teacher/reports",
  component: AttendanceAnalytics,
});

const studentDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/dashboard",
  component: StudentDashboard,
});

const studentRegisterFaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/register-face",
  component: FaceRegister,
});

const studentClassesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/classes",
  component: StudentDashboard,
});

const studentAttendanceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/attendance",
  component: AttendanceCapture,
});
const studentQRCheckinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/student/qr-checkin",
  component: StudentQRCheckin,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <PlaceholderPage
      title="Settings"
      description="Manage your account settings."
    />
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  setupRoute,
  indexRoute,
  teacherDashboardRoute,
  teacherClassesRoute,
  teacherScanRoute,
  teacherReportsRoute,
  studentDashboardRoute,
  studentRegisterFaceRoute,
  studentClassesRoute,
  studentAttendanceRoute,
  studentQRCheckinRoute,
  settingsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
