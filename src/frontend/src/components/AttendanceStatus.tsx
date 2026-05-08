import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceRecord, Class } from "@/types";
import { format } from "date-fns";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface AttendanceStatusProps {
  records: AttendanceRecord[];
  classes: Class[];
  /** If true, shows only today's records in a compact layout */
  todayOnly?: boolean;
}

function formatTimestamp(ts: bigint): string {
  // Backend stores nanoseconds
  const ms = Number(ts / 1_000_000n);
  return format(new Date(ms), "hh:mm a, MMM d yyyy");
}

function getClassNameById(classes: Class[], classId: bigint): string {
  return (
    classes.find((c) => c.id === classId)?.name ??
    `Class #${classId.toString()}`
  );
}

export function AttendanceStatus({
  records,
  classes,
  todayOnly = false,
}: AttendanceStatusProps) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const filtered = todayOnly
    ? records.filter((r) => r.dateKey === todayKey)
    : records;

  if (filtered.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 gap-3 text-center"
        data-ocid="attendance_status.empty_state"
      >
        <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
          <XCircle className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          {todayOnly
            ? "No attendance recorded today."
            : "No attendance records yet."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" data-ocid="attendance_status.list">
      {filtered.map((record, i) => (
        <li
          key={record.id.toString()}
          className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40 border border-border hover:bg-secondary/60 transition-colors"
          data-ocid={`attendance_status.item.${i + 1}`}
        >
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {getClassNameById(classes, record.classId)}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3" />
              {formatTimestamp(record.timestamp)}
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-accent/30 text-accent bg-accent/5 shrink-0"
          >
            {Math.round(record.confidence * 100)}%
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** Compact card variant for dashboard overview */
export function TodayAttendanceCard({
  records,
  classes,
}: { records: AttendanceRecord[]; classes: Class[] }) {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayRecords = records.filter((r) => r.dateKey === todayKey);
  const totalClasses = classes.length;
  const attendedCount = new Set(todayRecords.map((r) => r.classId.toString()))
    .size;

  return (
    <Card data-ocid="today_attendance_card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Today's Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 mb-3">
          <span className="font-display text-3xl font-bold text-foreground">
            {attendedCount}
          </span>
          <span className="text-muted-foreground text-sm mb-1">
            / {totalClasses} classes
          </span>
        </div>
        {todayRecords.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No check-ins yet today
          </p>
        ) : (
          <div className="space-y-1">
            {todayRecords.slice(0, 3).map((r, i) => (
              <div
                key={r.id.toString()}
                className="flex items-center justify-between text-xs"
                data-ocid={`today_attendance_card.item.${i + 1}`}
              >
                <span className="text-foreground truncate">
                  {getClassNameById(classes, r.classId)}
                </span>
                <Badge
                  variant="outline"
                  className="text-xs border-accent/30 text-accent bg-accent/5 ml-2"
                >
                  Present
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
