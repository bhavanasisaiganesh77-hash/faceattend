import { Role } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useSaveProfile } from "@/hooks/useProfile";
import { useNavigate } from "@tanstack/react-router";
import { BookOpen, GraduationCap, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SetupProfile() {
  const { isAuthenticated } = useAuth();
  const { mutateAsync: saveProfile, isPending } = useSaveProfile();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [nameError, setNameError] = useState("");

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!selectedRole) {
      toast.error("Please select your role");
      return;
    }
    try {
      await saveProfile({
        name: name.trim(),
        role: selectedRole,
        faceImageUrl: "",
      });
      toast.success("Profile created! Welcome to AttendSync.");
      if (selectedRole === Role.teacher) {
        void navigate({ to: "/teacher/dashboard" });
      } else {
        void navigate({ to: "/student/dashboard" });
      }
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const roles = [
    {
      value: Role.student,
      label: "Student",
      description: "Join classes and track your attendance",
      icon: GraduationCap,
    },
    {
      value: Role.teacher,
      label: "Teacher",
      description: "Create classes and manage attendance",
      icon: BookOpen,
    },
  ];

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-ocid="setup.page"
    >
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground text-lg">
            AttendSync
          </span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-card border border-border rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Set Up Your Profile
              </h1>
              <p className="text-muted-foreground text-sm mt-2">
                Tell us about yourself to get started
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (e.target.value.trim()) setNameError("");
                  }}
                  placeholder="Enter your full name"
                  className="h-11"
                  data-ocid="setup.name_input"
                />
                {nameError && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="setup.name_field_error"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              {/* Role selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">I am a...</Label>
                <div
                  className="grid grid-cols-2 gap-3"
                  data-ocid="setup.role_select"
                >
                  {roles.map((role) => {
                    const Icon = role.icon;
                    const isSelected = selectedRole === role.value;
                    return (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => setSelectedRole(role.value)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-muted/50"
                        }`}
                        data-ocid={`setup.role_${role.value}_button`}
                      >
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            isSelected ? "bg-primary/15" : "bg-muted"
                          }`}
                        >
                          <Icon
                            className={`w-5 h-5 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isSelected ? "text-primary" : "text-foreground"
                            }`}
                          >
                            {role.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                            {role.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 font-semibold"
                data-ocid="setup.submit_button"
              >
                {isPending ? "Saving..." : "Continue to Dashboard"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
