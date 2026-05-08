import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCamera } from "@caffeineai/camera";
import {
  Camera,
  CameraOff,
  RefreshCw,
  Scan,
  SwitchCamera,
  ZapOff,
} from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

export interface FaceCameraProps {
  /** Called every animation frame with the current video element for face detection */
  onVideoFrame?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  /** Whether face detection is actively running */
  isDetecting?: boolean;
  /** Confidence score 0-1 shown as overlay */
  confidence?: number | null;
  /** Status label shown below confidence */
  statusLabel?: string | null;
  /** Show capture button */
  showCapture?: boolean;
  /** Called when the capture button is clicked */
  onCapture?: () => void;
  /** Overlay children (e.g. detection bounding box canvas) */
  overlayChildren?: React.ReactNode;
  className?: string;
}

export function FaceCamera({
  onVideoFrame,
  isDetecting = false,
  confidence = null,
  statusLabel = null,
  showCapture = false,
  onCapture,
  overlayChildren,
  className = "",
}: FaceCameraProps) {
  const {
    isActive,
    isSupported,
    error,
    isLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 640, height: 480, quality: 0.92 });

  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (videoRef.current && canvasRef.current && isActive && onVideoFrame) {
      onVideoFrame(videoRef.current, canvasRef.current);
    }
    rafRef.current = window.setTimeout(tick, 400) as unknown as number;
  }, [isActive, onVideoFrame, videoRef, canvasRef]);

  useEffect(() => {
    if (isActive && onVideoFrame) {
      rafRef.current = window.setTimeout(tick, 400) as unknown as number;
    }
    return () => {
      if (rafRef.current !== null) clearTimeout(rafRef.current);
    };
  }, [isActive, onVideoFrame, tick]);

  const confidencePct =
    confidence !== null ? Math.round(confidence * 100) : null;
  const confidenceColor =
    confidencePct === null
      ? ""
      : confidencePct >= 80
        ? "text-accent"
        : confidencePct >= 60
          ? "text-yellow-500"
          : "text-destructive";
  const barWidth = confidencePct ?? 0;

  const handleCapture = async () => {
    if (onCapture) onCapture();
    else await capturePhoto();
  };

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-foreground/5 border border-border shadow-lg ${className}`}
      data-ocid="face_camera"
    >
      {/* Video stream */}
      <div className="relative w-full" style={{ aspectRatio: "4/3" }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          data-ocid="face_camera.video"
        />
        {/* Hidden capture canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Detection overlay slot */}
        {overlayChildren && (
          <div className="absolute inset-0 pointer-events-none">
            {overlayChildren}
          </div>
        )}

        {/* Face box guide when camera is active and detecting */}
        {isActive && isDetecting && (
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
                    ? "0 0 12px oklch(0.6 0.15 170 / 0.5)"
                    : "none",
              }}
            />
          </div>
        )}

        {/* Confidence overlay */}
        {isActive && confidence !== null && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
            <p
              className={`font-display text-xl font-bold text-center ${confidenceColor}`}
              data-ocid="face_camera.confidence_label"
            >
              Match: {confidencePct}% Confidence
            </p>
            <div className="mt-1.5 h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${barWidth}%`,
                  background:
                    confidencePct !== null && confidencePct >= 70
                      ? "oklch(0.6 0.15 170)"
                      : "oklch(0.65 0.18 25)",
                }}
                data-ocid="face_camera.confidence_bar"
              />
            </div>
          </div>
        )}

        {/* Status label */}
        {statusLabel && (
          <div className="absolute top-3 left-0 right-0 flex justify-center">
            <Badge
              variant="secondary"
              className="bg-card/90 backdrop-blur-sm font-medium"
              data-ocid="face_camera.status_label"
            >
              {statusLabel}
            </Badge>
          </div>
        )}

        {/* Camera inactive placeholder */}
        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <CameraOff className="w-8 h-8 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground">Camera is off</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/60">
            <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Starting camera…</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border">
        <div className="flex items-center gap-2">
          {!isActive ? (
            <Button
              size="sm"
              onClick={() => void startCamera()}
              disabled={isLoading || isSupported === false}
              data-ocid="face_camera.start_button"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Start Camera
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void stopCamera()}
              disabled={isLoading}
              data-ocid="face_camera.stop_button"
            >
              <ZapOff className="w-4 h-4 mr-1.5" />
              Stop
            </Button>
          )}

          {showCapture && isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleCapture()}
              disabled={isLoading || !isActive}
              data-ocid="face_camera.capture_button"
            >
              <Scan className="w-4 h-4 mr-1.5" />
              Capture
            </Button>
          )}
        </div>

        {isActive && isDetecting && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
            <div className="w-2 h-2 rounded-full bg-accent" />
            Detecting…
          </div>
        )}

        {error && (
          <p
            className="text-xs text-destructive flex items-center gap-1"
            data-ocid="face_camera.error_state"
          >
            <RefreshCw className="w-3 h-3" />
            {error.message}
          </p>
        )}
      </div>
    </div>
  );
}
