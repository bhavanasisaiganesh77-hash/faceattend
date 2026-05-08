import { createActor } from "@/backend";
import { Role } from "@/backend";
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
import { useAuth } from "@/hooks/useAuth";
import { useActor } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import jsQR from "jsqr";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ScanState =
  | "requesting_camera"
  | "scanning"
  | "processing"
  | "success"
  | "error_invalid_qr"
  | "error_expired"
  | "error_already_marked"
  | "error_camera_denied"
  | "error_marking";

interface QRPayload {
  classId: string;
  dateKey: string;
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseQRPayload(raw: string): QRPayload | null {
  try {
    const obj = JSON.parse(raw) as unknown;
    if (
      typeof obj === "object" &&
      obj !== null &&
      "classId" in obj &&
      "dateKey" in obj &&
      typeof (obj as Record<string, unknown>).classId === "string" &&
      typeof (obj as Record<string, unknown>).dateKey === "string"
    ) {
      return obj as QRPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export default function StudentQRCheckin() {
  const { currentPrincipal } = useAuth();
  const { actor } = useActor(createActor);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [scanState, setScanState] = useState<ScanState>("requesting_camera");
  const [successTime, setSuccessTime] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    setScanState("requesting_camera");
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanState("scanning");
    } catch {
      setScanState("error_camera_denied");
    }
  }, []);

  // Frame scanning loop
  useEffect(() => {
    if (scanState !== "scanning") return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code?.data) {
        handleQRDetected(code.data);
      }
    };

    scanIntervalRef.current = setInterval(scanFrame, 300);
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
    // handleQRDetected is defined below with useCallback but we intentionally
    // exclude it to avoid re-running this effect on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  const handleQRDetected = useCallback(
    async (raw: string) => {
      if (scanState !== "scanning") return;
      setScanState("processing");

      // Stop scanning immediately to avoid double-processing
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }

      const payload = parseQRPayload(raw);
      if (!payload) {
        setScanState("error_invalid_qr");
        return;
      }

      const today = getTodayKey();
      if (payload.dateKey !== today) {
        setScanState("error_expired");
        return;
      }

      if (!actor || !currentPrincipal) {
        setScanState("error_marking");
        setErrorMessage("Not authenticated. Please refresh and try again.");
        return;
      }

      try {
        const classId = BigInt(payload.classId);
        const result = await actor.markMyAttendanceQR(classId);

        if (result === null) {
          // null means already marked
          setScanState("error_already_marked");
        } else {
          stopCamera();
          setSuccessTime(new Date().toLocaleTimeString());
          setScanState("success");
        }
      } catch {
        setScanState("error_marking");
        setErrorMessage("Failed to record attendance. Please try again.");
      }
    },
    [scanState, actor, currentPrincipal, stopCamera],
  );

  const handleRetry = useCallback(async () => {
    setErrorMessage(null);
    setSuccessTime(null);
    await startCamera();
  }, [startCamera]);

  // Start camera on mount
  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const isErrorState =
    scanState === "error_invalid_qr" ||
    scanState === "error_expired" ||
    scanState === "error_already_marked" ||
    scanState === "error_camera_denied" ||
    scanState === "error_marking";

  const errorConfig: Record<string, { title: string; description: string }> = {
    error_invalid_qr: {
      title: "Invalid QR Code",
      description:
        "This QR code doesn't appear to be a valid attendance code. Ask your teacher to show the correct QR.",
    },
    error_expired: {
      title: "QR Code Expired",
      description:
        "This QR code is from a different day and can no longer be used. Ask your teacher for today's QR code.",
    },
    error_already_marked: {
      title: "Already Checked In",
      description:
        "Your attendance for this class has already been recorded today. No need to check in again.",
    },
    error_camera_denied: {
      title: "Camera Access Denied",
      description:
        "Please allow camera access in your browser settings, then try again.",
    },
    error_marking: {
      title: "Could Not Record Attendance",
      description:
        errorMessage ??
        "Something went wrong marking your attendance. Please try again.",
    },
  };

  const currentError = isErrorState ? errorConfig[scanState] : null;

  return (
    <ProtectedRoute requiredRole={Role.student}>
      <Layout>
        <div className="max-w-lg mx-auto space-y-6" data-ocid="qr_checkin.page">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/student/attendance">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Back to attendance"
                data-ocid="qr_checkin.back_button"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                QR Check-in
              </h1>
              <p className="text-muted-foreground text-sm">
                Scan your teacher's QR code to mark attendance
              </p>
            </div>
          </div>

          {/* Camera viewfinder */}
          <Card data-ocid="qr_checkin.camera_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <QrCode className="w-4 h-4 text-primary" />
                Point camera at QR code
              </CardTitle>
              <CardDescription>
                Hold the QR code steady within the frame
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="relative rounded-2xl overflow-hidden bg-muted border border-border"
                style={{ aspectRatio: "4/3" }}
              >
                {/* Live camera feed */}
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning overlay with corner brackets */}
                {scanState === "scanning" && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-52 h-52">
                      {/* Corner brackets */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br" />
                      {/* Scanning line */}
                      <div className="absolute left-2 right-2 h-0.5 bg-primary/60 top-1/2 animate-pulse" />
                    </div>
                  </div>
                )}

                {/* Requesting camera */}
                {scanState === "requesting_camera" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80"
                    data-ocid="qr_checkin.loading_state"
                  >
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Starting camera…
                    </p>
                  </div>
                )}

                {/* Processing */}
                {scanState === "processing" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80"
                    data-ocid="qr_checkin.loading_state"
                  >
                    <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      Verifying QR code…
                    </p>
                  </div>
                )}

                {/* Success overlay */}
                {scanState === "success" && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-accent/10"
                    data-ocid="qr_checkin.success_state"
                  >
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                      <CheckCircle2 className="w-10 h-10 text-accent" />
                    </div>
                    <p className="font-display text-xl font-bold text-accent">
                      Attendance Marked!
                    </p>
                    {successTime && (
                      <p className="text-sm text-muted-foreground">
                        Checked in at {successTime}
                      </p>
                    )}
                  </div>
                )}

                {/* Error overlay */}
                {isErrorState && (
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-destructive/5 p-6"
                    data-ocid="qr_checkin.error_state"
                  >
                    <div className="w-16 h-16 rounded-full bg-destructive/15 flex items-center justify-center">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    {currentError && (
                      <>
                        <p className="font-display text-base font-bold text-destructive text-center">
                          {currentError.title}
                        </p>
                        <p className="text-sm text-muted-foreground text-center leading-relaxed">
                          {currentError.description}
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Status badge */}
                {scanState === "scanning" && (
                  <div className="absolute top-3 left-0 right-0 flex justify-center">
                    <Badge
                      variant="secondary"
                      className="bg-card/90 backdrop-blur-sm font-medium"
                    >
                      Scanning…
                    </Badge>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {scanState === "success" ? (
                  <Link to="/student/dashboard" className="flex-1">
                    <Button
                      className="w-full"
                      data-ocid="qr_checkin.go_dashboard_button"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : isErrorState ? (
                  <>
                    {scanState !== "error_already_marked" && (
                      <Button
                        className="flex-1"
                        onClick={() => void handleRetry()}
                        data-ocid="qr_checkin.retry_button"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                    <Link to="/student/attendance" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        data-ocid="qr_checkin.back_to_face_button"
                      >
                        Use Face Recognition
                      </Button>
                    </Link>
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          {scanState === "scanning" && (
            <Card
              className="bg-muted/40 border-dashed"
              data-ocid="qr_checkin.tips_card"
            >
              <CardContent className="pt-4 pb-4">
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Make sure the QR code is fully visible and well-lit
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    Hold steady — scanning happens automatically
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    QR codes expire at midnight each day
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
