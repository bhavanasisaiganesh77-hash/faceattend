import { Role } from "@/backend";
import { createActor } from "@/backend";
import { FaceCamera } from "@/components/FaceCamera";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMyProfile, useSaveProfile } from "@/hooks/useProfile";
import { useCamera } from "@caffeineai/camera";

import {
  CheckCircle2,
  Info,
  RotateCcw,
  Save,
  Upload,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

type Step = "view" | "capture" | "preview" | "uploading" | "saving" | "done";

export default function FaceRegister() {
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const saveProfile = useSaveProfile();

  const [step, setStep] = useState<Step>("view");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    isActive,
    isLoading: camLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "user", width: 640, height: 480, quality: 0.92 });

  const handleStartCapture = async () => {
    setStep("capture");
    await startCamera();
  };

  const handleCapture = async () => {
    const file = await capturePhoto();
    if (!file) {
      toast.error("Failed to capture photo. Please try again.");
      return;
    }
    setCapturedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    void stopCamera();
    setStep("preview");
  };

  const handleRetake = async () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setCapturedFile(null);
    setPreviewUrl(null);
    setStep("capture");
    await startCamera();
  };

  const handleUploadAndSave = async () => {
    if (!capturedFile || !profile) return;
    setStep("uploading");
    setUploadProgress(0);

    try {
      // Convert the captured photo to a base64 data URL for inline storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadProgress(50);
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(capturedFile);
      });
      setUploadProgress(100);

      setStep("saving");
      await saveProfile.mutateAsync({
        name: profile.name,
        role: profile.role,
        faceImageUrl: dataUrl,
      });

      setStep("done");
      toast.success("Face photo registered successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed. Please try again.");
      setStep("preview");
    }
  };

  return (
    <ProtectedRoute requiredRole={Role.student}>
      <Layout>
        <div
          className="max-w-2xl mx-auto space-y-6"
          data-ocid="face_register.page"
        >
          {/* Header */}
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Register Your Face
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Take a clear photo in good lighting so the system can recognize
              you during attendance.
            </p>
          </div>

          {/* Current photo */}
          <Card data-ocid="face_register.current_photo_card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Current Registered Photo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profileLoading ? (
                <Skeleton className="w-24 h-24 rounded-full" />
              ) : profile?.faceImageUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={profile.faceImageUrl}
                    alt={profile.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-accent/30 shadow"
                    data-ocid="face_register.current_photo"
                  />
                  <div>
                    <p className="font-medium text-foreground">
                      {profile.name}
                    </p>
                    <Badge
                      variant="outline"
                      className="text-xs border-accent/30 text-accent bg-accent/5 mt-1"
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Photo registered
                    </Badge>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-4"
                  data-ocid="face_register.no_photo_state"
                >
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                    <User className="w-10 h-10 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      No face photo registered yet.
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Register a photo to enable face recognition attendance.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card
            className="border-primary/20 bg-primary/5"
            data-ocid="face_register.tips_card"
          >
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-1">
                  <p className="font-medium text-foreground">
                    Tips for best results
                  </p>
                  <ul className="text-muted-foreground space-y-0.5 text-xs list-disc list-inside">
                    <li>Use good front-facing lighting</li>
                    <li>Look directly at the camera</li>
                    <li>Keep a neutral expression</li>
                    <li>Ensure your full face is visible</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Camera / preview area */}
          {(step === "capture" || step === "view") && (
            <Card data-ocid="face_register.camera_card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Take a New Photo
                </CardTitle>
                <CardDescription>
                  Position your face in the frame and tap Capture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step === "view" ? (
                  <Button
                    className="w-full"
                    onClick={() => void handleStartCapture()}
                    data-ocid="face_register.open_camera_button"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Open Camera
                  </Button>
                ) : (
                  <>
                    <div
                      className="relative rounded-2xl overflow-hidden border border-border"
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
                      {camLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                          <div className="w-10 h-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                        </div>
                      )}
                      {/* Face guide box */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="border-2 border-primary/50 rounded-lg"
                          style={{ width: "45%", height: "60%" }}
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => void handleCapture()}
                      disabled={!isActive || camLoading}
                      data-ocid="face_register.capture_button"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Capture Photo
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Preview & confirm */}
          {step === "preview" && previewUrl && (
            <Card data-ocid="face_register.preview_card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  Preview &amp; Confirm
                </CardTitle>
                <CardDescription>
                  Make sure your face is clearly visible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="relative rounded-2xl overflow-hidden border border-border"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img
                    src={previewUrl}
                    alt="Captured face"
                    className="w-full h-full object-cover"
                    data-ocid="face_register.preview_image"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => void handleRetake()}
                    data-ocid="face_register.retake_button"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => void handleUploadAndSave()}
                    data-ocid="face_register.save_button"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload progress */}
          {(step === "uploading" || step === "saving") && (
            <Card data-ocid="face_register.upload_progress_card">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    {step === "uploading"
                      ? "Uploading photo…"
                      : "Saving profile…"}
                  </p>
                </div>
                {step === "uploading" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Upload progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress
                      value={uploadProgress}
                      className="h-2"
                      data-ocid="face_register.upload_progress"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Done */}
          {step === "done" && (
            <Card
              className="border-accent/20 bg-accent/5"
              data-ocid="face_register.success_state"
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">
                      Face Registered!
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can now mark attendance using face recognition.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setStep("view")}
                    data-ocid="face_register.register_again_button"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Update Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
