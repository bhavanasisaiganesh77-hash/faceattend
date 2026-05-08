import { Role } from "@/backend";
import { AttendanceStatus } from "@/components/AttendanceStatus";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useGetMyProfile } from "@/hooks/useProfile";
import {
  useGetMyAttendance,
  useListClasses,
  useMarkAttendance,
} from "@/hooks/useQueries";
import { useCamera } from "@caffeineai/camera";
import { Link } from "@tanstack/react-router";
import * as faceapi from "face-api.js";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ScanFace,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type DetectionState =
  | "idle"
  | "loading_models"
  | "ready"
  | "detecting"
  | "matched"
  | "no_face"
  | "no_registered"
  | "marking"
  | "marked"
  | "failed";

const MODEL_URL =
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model";

let modelsLoaded = false;
async function ensureModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

async function getDescriptorFromUrl(url: string): Promise<Float32Array | null> {
  try {
    const img = await faceapi.fetchImage(url);
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection?.descriptor ?? null;
  } catch {
    return null;
  }
}

export default function AttendanceCapture() {
  const { currentPrincipal } = useAuth();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: classes = [], isLoading: classesLoading } = useListClasses();
  const { data: attendance = [] } = useGetMyAttendance();
  const markAttendance = useMarkAttendance();

  const [selectedClassId, setSelectedClassId] = useState<bigint | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>("idle");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const registeredDescriptor = useRef<Float32Array | null>(null);
  const lastMarkRef = useRef<number>(0);

  const {
    isActive,
    isLoading: camLoading,
    startCamera,
    stopCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 640, height: 480 });

  // My enrolled classes
  const myClasses = classes.filter((c) =>
    currentPrincipal
      ? c.studentIds.some(
          (sid) => sid.toString() === currentPrincipal.toString(),
        )
      : false,
  );

  // Today's already marked attendance for this class
  const today = new Date().toISOString().slice(0, 10);
  const alreadyMarked = attendance.some(
    (r) =>
      r.dateKey === today &&
      selectedClassId !== null &&
      r.classId === selectedClassId,
  );

  const handleStartSession = async () => {
    if (!selectedClassId) {
      toast.warning("Please select a class first.");
      return;
    }
    if (!profile?.faceImageUrl) {
      setDetectionState("no_registered");
      toast.error("No face photo registered. Please register your face first.");
      return;
    }

    setDetectionState("loading_models");
    setConfidence(null);
    setErrorMessage(null);

    try {
      await ensureModels();
      const desc = await getDescriptorFromUrl(profile.faceImageUrl);
      if (!desc) {
        setDetectionState("no_registered");
        toast.error(
          "Could not extract face from your registered photo. Please re-register.",
        );
        return;
      }
      registeredDescriptor.current = desc;
      await startCamera();
      setDetectionState("detecting");
    } catch (err) {
      console.error(err);
      setDetectionState("failed");
      setErrorMessage(
        "Failed to load face recognition models. Check your internet connection.",
      );
    }
  };

  const handleStop = useCallback(async () => {
    await stopCamera();
    setDetectionState("idle");
    setConfidence(null);
    registeredDescriptor.current = null;
  }, [stopCamera]);

  // Detection loop
  const rafRef = useRef<number | null>(null);

  const runDetection = useCallback(async () => {
    if (!videoRef.current || !isActive || detectionState !== "detecting")
      return;
    const video = videoRef.current;
    if (video.readyState < 2) return;

    try {
      const detection = await faceapi
        .detectSingleFace(
          video,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setConfidence(null);
        return;
      }

      const registered = registeredDescriptor.current;
      if (!registered) return;

      const distance = faceapi.euclideanDistance(
        detection.descriptor,
        registered,
      );
      // Distance 0 = identical, ~1 = very different. Map to 0-1 confidence
      const conf = Math.max(0, 1 - distance);
      setConfidence(conf);

      // Auto-mark if confidence >= 0.7 and haven't just marked
      const now = Date.now();
      if (
        conf >= 0.7 &&
        selectedClassId !== null &&
        currentPrincipal &&
        now - lastMarkRef.current > 5000
      ) {
        lastMarkRef.current = now;
        setDetectionState("marking");
        markAttendance.mutate(
          {
            classId: selectedClassId,
            studentId: currentPrincipal.toString(),
            confidence: conf,
          },
          {
            onSuccess: (id) => {
              if (id !== null) {
                setDetectionState("marked");
                void stopCamera();
                toast.success(
                  `Attendance marked! Confidence: ${Math.round(conf * 100)}%`,
                );
              } else {
                setDetectionState("detecting");
                toast.warning(
                  "Attendance already recorded or class not found.",
                );
              }
            },
            onError: () => {
              setDetectionState("detecting");
              toast.error("Failed to mark attendance. Try again.");
            },
          },
        );
      }
    } catch {
      // silently ignore detection errors
    }
  }, [
    isActive,
    detectionState,
    selectedClassId,
    currentPrincipal,
    markAttendance,
    stopCamera,
    videoRef,
  ]);

  useEffect(() => {
    if (detectionState !== "detecting" || !isActive) return;
    const loop = () => {
      void runDetection();
      rafRef.current = window.setTimeout(loop, 400); // run every 400ms to reduce CPU usage
    };
    rafRef.current = window.setTimeout(loop, 400);
    return () => {
      if (rafRef.current !== null) clearTimeout(rafRef.current);
    };
  }, [detectionState, isActive, runDetection]);

  const confidencePct =
    confidence !== null ? Math.round(confidence * 100) : null;
  const barColor =
    confidencePct === null
      ? ""
      : confidencePct >= 70
        ? "oklch(0.6 0.15 170)"
        : confidencePct >= 50
          ? "oklch(0.7 0.15 85)"
          : "oklch(0.55 0.22 25)";

  const statusLabel =
    detectionState === "loading_models"
      ? "Loading AI models…"
      : detectionState === "detecting"
        ? confidence === null
          ? "Looking for face…"
          : undefined
        : detectionState === "marking"
          ? "Marking attendance…"
          : detectionState === "marked"
            ? "Attendance marked!"
            : undefined;

  return (
    <ProtectedRoute requiredRole={Role.student}>
      <Layout>
        <div
          className="max-w-2xl mx-auto space-y-6"
          data-ocid="attendance_capture.page"
        >
          {/* Header */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Mark Attendance
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Face recognition will automatically mark you present when your
              face matches.
            </p>
          </div>

          {/* Class selector */}
          <Card data-ocid="attendance_capture.class_selector_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Select Class
              </CardTitle>
              <CardDescription>
                Choose the class you're attending right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {classesLoading ? (
                <Skeleton className="h-10 w-full rounded-md" />
              ) : myClasses.length === 0 ? (
                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  data-ocid="attendance_capture.no_classes_state"
                >
                  <AlertTriangle className="w-4 h-4" />
                  You're not enrolled in any classes.
                </div>
              ) : (
                <Select
                  value={selectedClassId?.toString() ?? ""}
                  onValueChange={(v) => setSelectedClassId(BigInt(v))}
                  disabled={
                    detectionState === "detecting" ||
                    detectionState === "marking"
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    data-ocid="attendance_capture.class_select"
                  >
                    <SelectValue placeholder="Choose a class…" />
                  </SelectTrigger>
                  <SelectContent>
                    {myClasses.map((cls) => (
                      <SelectItem
                        key={cls.id.toString()}
                        value={cls.id.toString()}
                        data-ocid={`attendance_capture.class_option.${cls.id.toString()}`}
                      >
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Already marked */}
              {alreadyMarked && selectedClassId !== null && (
                <div
                  className="flex items-center gap-2 mt-3 text-sm text-accent"
                  data-ocid="attendance_capture.already_marked_state"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Attendance already marked for this class today.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Camera + detection */}
          <Card data-ocid="attendance_capture.camera_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Face Recognition
              </CardTitle>
              <CardDescription>
                Hold your face steady in good lighting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Video area */}
              <div
                className="relative rounded-2xl overflow-hidden bg-muted border border-border"
                style={{ aspectRatio: "4/3" }}
              >
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Face guide when detecting */}
                {(detectionState === "detecting" ||
                  detectionState === "marking") && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className="border-2 rounded-lg transition-all duration-300"
                      style={{
                        width: "45%",
                        height: "60%",
                        borderColor:
                          confidencePct !== null && confidencePct >= 70
                            ? "oklch(0.6 0.15 170)"
                            : "oklch(0.7 0.04 230 / 0.6)",
                        boxShadow:
                          confidencePct !== null && confidencePct >= 70
                            ? "0 0 14px oklch(0.6 0.15 170 / 0.6)"
                            : "none",
                      }}
                    />
                  </div>
                )}

                {/* Confidence overlay */}
                {isActive && confidence !== null && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                    <p
                      className="font-display text-lg font-bold text-center"
                      style={{
                        color:
                          confidencePct !== null && confidencePct >= 70
                            ? "oklch(0.7 0.18 170)"
                            : "oklch(0.85 0.15 85)",
                      }}
                      data-ocid="attendance_capture.confidence_label"
                    >
                      Match: {confidencePct}% Confidence
                    </p>
                    <div className="mt-1.5 h-2 rounded-full bg-white/20 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${confidencePct ?? 0}%`,
                          background: barColor,
                        }}
                        data-ocid="attendance_capture.confidence_bar"
                      />
                    </div>
                  </div>
                )}

                {/* Status badge */}
                {statusLabel && (
                  <div className="absolute top-3 left-0 right-0 flex justify-center">
                    <Badge
                      variant="secondary"
                      className="bg-card/90 backdrop-blur-sm font-medium"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                )}

                {/* Idle / not started */}
                {!isActive &&
                  detectionState !== "marked" &&
                  detectionState !== "loading_models" && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <ScanFace className="w-8 h-8 text-primary/60" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Camera is off
                      </p>
                    </div>
                  )}

                {/* Loading models */}
                {detectionState === "loading_models" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Loading AI models…
                    </p>
                  </div>
                )}

                {/* Camera loading */}
                {camLoading && detectionState !== "loading_models" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60">
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Starting camera…
                    </p>
                  </div>
                )}

                {/* Marked success */}
                {detectionState === "marked" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-accent/10"
                    data-ocid="attendance_capture.success_state"
                  >
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-accent" />
                    </div>
                    <p className="font-display text-xl font-bold text-accent">
                      Attendance Marked!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      You're checked in.
                    </p>
                  </div>
                )}
              </div>

              {/* Action button */}
              <div className="flex gap-3">
                {detectionState === "idle" ||
                detectionState === "no_registered" ||
                detectionState === "failed" ? (
                  <Button
                    className="flex-1"
                    onClick={() => void handleStartSession()}
                    disabled={
                      !selectedClassId ||
                      classesLoading ||
                      profileLoading ||
                      alreadyMarked
                    }
                    data-ocid="attendance_capture.start_button"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {alreadyMarked
                      ? "Already Marked Today"
                      : "Start Face Recognition"}
                  </Button>
                ) : detectionState === "marked" ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDetectionState("idle");
                      setConfidence(null);
                    }}
                    data-ocid="attendance_capture.restart_button"
                  >
                    Start Again
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => void handleStop()}
                    disabled={
                      detectionState === "marking" ||
                      detectionState === "loading_models"
                    }
                    data-ocid="attendance_capture.stop_button"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                )}
              </div>

              {/* Error */}
              {errorMessage && (
                <div
                  className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  data-ocid="attendance_capture.error_state"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {/* No registered face warning */}
              {detectionState === "no_registered" && (
                <div
                  className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                  data-ocid="attendance_capture.no_face_registered_state"
                >
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5" />
                  <p className="text-sm text-destructive">
                    No face photo registered.{" "}
                    <Link
                      to="/student/register-face"
                      className="underline font-medium"
                    >
                      Register your face
                    </Link>{" "}
                    first.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's attendance */}
          <Card data-ocid="attendance_capture.today_history_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceStatus
                records={attendance}
                classes={myClasses}
                todayOnly
              />
            </CardContent>
            {/* QR fallback */}
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground">
                Having trouble with face recognition?{" "}
                <Link
                  to="/student/qr-checkin"
                  className="text-primary underline underline-offset-2 font-medium hover:opacity-80 transition-opacity"
                  data-ocid="attendance_capture.qr_checkin_link"
                >
                  Try QR check-in
                </Link>
              </p>
            </div>{" "}
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
