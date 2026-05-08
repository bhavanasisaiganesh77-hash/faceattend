import { Role } from "@/backend";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useListClasses } from "@/hooks/useQueries";
import { encodeQR } from "@/lib/qr-encode";
import type { Class } from "@/types";
import {
  CalendarDays,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTodayDisplay(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── QR Canvas renderer ────────────────────────────────────────────────────
interface QRCanvasProps {
  payload: string;
  size?: number;
  refreshKey: number;
}

function QRCanvas({ payload, size = 280, refreshKey }: QRCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const matrix = encodeQR(payload);
      const modules = matrix.length;
      const moduleSize = Math.floor(size / (modules + 8)); // quiet zone 4 modules each side
      const quiet = 4 * moduleSize;
      const totalSize = modules * moduleSize + quiet * 2;
      canvas.width = totalSize;
      canvas.height = totalSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, totalSize, totalSize);
      // Modules
      ctx.fillStyle = "#0f172a";
      for (let r = 0; r < modules; r++) {
        for (let c = 0; c < modules; c++) {
          if (matrix[r][c]) {
            ctx.fillRect(
              quiet + c * moduleSize,
              quiet + r * moduleSize,
              moduleSize,
              moduleSize,
            );
          }
        }
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "QR generation failed");
    }
  }, [payload, size]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey triggers redraw
  useEffect(() => {
    draw();
  }, [draw, refreshKey]);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-destructive/10 rounded-xl border border-destructive/30 text-destructive text-sm p-6 gap-2"
        style={{ width: size, height: size }}
        data-ocid="qr_session.error_state"
      >
        <QrCode className="w-8 h-8 opacity-50" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl shadow-lg ring-1 ring-border"
      data-ocid="qr_session.qr_canvas"
    />
  );
}

// ─── Main session panel ────────────────────────────────────────────────────
function SessionPanel({ classes }: { classes: Class[] }) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    classes.length === 1 ? classes[0].id.toString() : null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const todayKey = getTodayKey();
  const todayDisplay = formatTodayDisplay();

  const selectedClass = classes.find(
    (c) => c.id.toString() === selectedClassId,
  );

  const qrPayload = selectedClass
    ? JSON.stringify({
        classId: selectedClass.id.toString(),
        dateKey: todayKey,
      })
    : null;

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-8" data-ocid="qr_session.page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Take Attendance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate a QR code for students to scan and mark their attendance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg border border-border">
          <CalendarDays className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{todayDisplay}</span>
        </div>
      </div>

      {/* Class selector */}
      <Card
        className="border-border"
        data-ocid="qr_session.class_selector_card"
      >
        <CardContent className="p-5">
          <label
            htmlFor="class-select"
            className="block text-sm font-medium text-foreground mb-2"
          >
            Select Class
          </label>
          <Select
            value={selectedClassId ?? ""}
            onValueChange={(v) => setSelectedClassId(v)}
          >
            <SelectTrigger
              id="class-select"
              className="w-full sm:max-w-sm"
              data-ocid="qr_session.class_select"
            >
              <SelectValue placeholder="Choose a class to open session…" />
            </SelectTrigger>
            <SelectContent data-ocid="qr_session.class_select_content">
              {classes.map((cls) => (
                <SelectItem
                  key={cls.id.toString()}
                  value={cls.id.toString()}
                  data-ocid={`qr_session.class_option.${cls.id.toString()}`}
                >
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* QR display */}
      {qrPayload ? (
        <motion.div
          key={selectedClassId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        >
          <Card
            className="border-border overflow-hidden"
            data-ocid="qr_session.qr_card"
          >
            <CardContent className="p-0">
              {/* Session open banner */}
              <div className="flex items-center gap-2.5 px-5 py-3 bg-accent/10 border-b border-accent/20">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
                </span>
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-accent">
                  Session is open
                </span>
                <Badge
                  variant="outline"
                  className="ml-auto text-xs border-accent/40 text-accent bg-accent/10"
                  data-ocid="qr_session.date_badge"
                >
                  {todayKey}
                </Badge>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-6 px-6 py-10 bg-muted/20">
                <div className="p-4 bg-card rounded-2xl shadow-sm border border-border">
                  <QRCanvas
                    payload={qrPayload}
                    size={300}
                    refreshKey={refreshKey}
                  />
                </div>

                {/* Class + date info */}
                <div className="text-center space-y-1">
                  <p className="font-display font-semibold text-foreground text-lg">
                    {selectedClass?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {todayDisplay}
                  </p>
                </div>

                {/* Instruction */}
                <div className="flex items-start gap-3 max-w-xs text-center justify-center">
                  <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Students: scan this code with your phone to mark attendance
                  </p>
                </div>

                {/* Refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="gap-2"
                  data-ocid="qr_session.refresh_button"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <Card
          className="border-dashed border-2 border-border"
          data-ocid="qr_session.empty_state"
        >
          <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <QrCode className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">
                Select a class to begin
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Choose a class above and a QR code will appear for students to
                scan.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TeacherQRSessionContent() {
  const { data: classes = [], isLoading } = useListClasses();

  return (
    <Layout>
      {isLoading ? (
        <div className="space-y-8">
          <div className="space-y-1">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      ) : classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground mb-1">
              No classes found
            </h2>
            <p className="text-sm text-muted-foreground">
              Create a class first from the dashboard before opening a session.
            </p>
          </div>
        </div>
      ) : (
        <SessionPanel classes={classes} />
      )}
    </Layout>
  );
}

export default function TeacherQRSession() {
  return (
    <ProtectedRoute requiredRole={Role.teacher}>
      <TeacherQRSessionContent />
    </ProtectedRoute>
  );
}
