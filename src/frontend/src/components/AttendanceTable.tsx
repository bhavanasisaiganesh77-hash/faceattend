import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceRecord, Profile } from "@/types";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface AttendanceTableProps {
  students: Profile[];
  attendanceRecords: AttendanceRecord[];
  isLoading?: boolean;
}

function formatTime(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AttendanceTable({
  students,
  attendanceRecords,
  isLoading,
}: AttendanceTableProps) {
  const recordByStudentId = new Map<string, AttendanceRecord>();
  for (const r of attendanceRecords) {
    recordByStudentId.set(r.studentId.toText(), r);
  }

  if (isLoading) {
    return (
      <div className="space-y-2" data-ocid="attendance_table.loading_state">
        <div className="h-12 rounded-md bg-muted animate-pulse" />
        <div className="h-12 rounded-md bg-muted animate-pulse" />
        <div className="h-12 rounded-md bg-muted animate-pulse" />
        <div className="h-12 rounded-md bg-muted animate-pulse" />
        <div className="h-12 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-ocid="attendance_table.empty_state"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <XCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No students enrolled
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Students will appear here once they join this class.
        </p>
      </div>
    );
  }

  const presentCount = attendanceRecords.length;
  const absentCount = students.length - presentCount;

  return (
    <div data-ocid="attendance_table">
      {/* Summary row */}
      <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/40">
        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="w-4 h-4 text-accent" />
          <span className="font-semibold text-foreground">{presentCount}</span>
          <span className="text-muted-foreground">present</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <XCircle className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{absentCount}</span>
          <span className="text-muted-foreground">absent</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold text-foreground">
            {students.length}
          </span>
        </div>
        {students.length > 0 && (
          <div className="ml-auto">
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-24 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-smooth"
                  style={{
                    width: `${(presentCount / students.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round((presentCount / students.length) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-display text-xs uppercase tracking-wide text-muted-foreground">
                Student
              </TableHead>
              <TableHead className="font-display text-xs uppercase tracking-wide text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="font-display text-xs uppercase tracking-wide text-muted-foreground text-right">
                Checked In
              </TableHead>
              <TableHead className="font-display text-xs uppercase tracking-wide text-muted-foreground text-right">
                Confidence
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student, i) => {
              const record = recordByStudentId.get(student.id.toText());
              const isPresent = !!record;
              return (
                <TableRow
                  key={student.id.toText()}
                  className="hover:bg-muted/30"
                  data-ocid={`attendance_table.row.${i + 1}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border flex-shrink-0">
                        {student.faceImageUrl ? (
                          <img
                            src={student.faceImageUrl}
                            alt={student.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-bold text-muted-foreground">
                              {student.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {student.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right">
                    {record ? (
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(record.timestamp)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record ? (
                      <span
                        className={`text-xs font-medium ${
                          record.confidence >= 0.9
                            ? "text-accent"
                            : record.confidence >= 0.7
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {(record.confidence * 100).toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
