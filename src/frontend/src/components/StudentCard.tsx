import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceRecord, ClassId, Profile } from "@/types";
import { CheckCircle2, UserCheck, XCircle } from "lucide-react";

interface StudentCardProps {
  profile: Profile;
  attendanceRecord?: AttendanceRecord;
  classId?: ClassId;
  onMarkPresent?: (studentId: string) => void;
  isMarkingLoading?: boolean;
  index: number;
}

export function StudentCard({
  profile,
  attendanceRecord,
  classId,
  onMarkPresent,
  isMarkingLoading,
  index,
}: StudentCardProps) {
  const isPresent = !!attendanceRecord;
  const confidence = attendanceRecord?.confidence ?? 0;
  const studentId = profile.id.toText();

  return (
    <Card
      className="overflow-hidden transition-smooth hover:shadow-md border-border"
      data-ocid={`student_card.item.${index}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted border-2 border-border">
              {profile.faceImageUrl ? (
                <img
                  src={profile.faceImageUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-muted-foreground text-lg font-display font-bold">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            {isPresent && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-accent-foreground" />
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm text-foreground truncate">
              {profile.name}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {studentId.slice(0, 12)}…
            </p>
            {isPresent && confidence > 0 && (
              <p className="text-xs text-accent font-medium mt-0.5">
                {(confidence * 100).toFixed(0)}% match
              </p>
            )}
          </div>

          {/* Status + action */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {isPresent ? (
              <Badge
                variant="outline"
                className="text-xs border-accent/40 text-accent bg-accent/10 gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                Present
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-xs border-muted-foreground/30 text-muted-foreground gap-1"
              >
                <XCircle className="w-3 h-3" />
                Absent
              </Badge>
            )}

            {!isPresent && classId !== undefined && onMarkPresent && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={() => onMarkPresent(studentId)}
                disabled={isMarkingLoading}
                data-ocid={`student_card.mark_present_button.${index}`}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Mark Present
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
