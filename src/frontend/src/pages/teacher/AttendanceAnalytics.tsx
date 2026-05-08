import type { AnalyticsResult, ClassStat, StudentStat } from "@/backend";
import { Role } from "@/backend";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAnalytics, useListClasses } from "@/hooks/useQueries";
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Download,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function rateColor(rate: number) {
  if (rate >= 0.75) return "text-accent";
  if (rate >= 0.5) return "text-chart-4";
  return "text-destructive";
}

function exportCSV(analytics: AnalyticsResult) {
  const header = [
    "Class Name",
    "Enrolled Count",
    "Present Count",
    "Rate %",
  ].join(",");
  const dataRows = analytics.classStats.map((cs) =>
    [
      `"${cs.className}"`,
      `${Number(cs.enrolledCount)}`,
      `${Number(cs.presentCount)}`,
      `${Math.round(cs.rate * 100)}`,
    ].join(","),
  );
  const csv = [header, ...dataRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-analytics-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="font-display text-3xl font-bold text-foreground">
                {value}
              </p>
            )}
            {sub && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ml-3">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type SortKey = "className" | "enrolledCount" | "presentCount" | "rate";
type SortDir = "asc" | "desc";

function ClassBreakdownTable({
  stats,
  loading,
}: {
  stats: ClassStat[];
  loading: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("rate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      let av: number | string =
        typeof a[sortKey] === "bigint"
          ? Number(a[sortKey] as bigint)
          : (a[sortKey] as number | string);
      let bv: number | string =
        typeof b[sortKey] === "bigint"
          ? Number(b[sortKey] as bigint)
          : (b[sortKey] as number | string);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [stats, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 ml-1 text-primary" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1 text-primary" />
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div
        data-ocid="analytics.class_table.empty_state"
        className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2"
      >
        <AlertCircle className="w-8 h-8 opacity-40" />
        <p className="text-sm">No class data for this period</p>
      </div>
    );
  }

  const cols: { key: SortKey; label: string; align: string }[] = [
    { key: "className", label: "Class Name", align: "text-left" },
    { key: "enrolledCount", label: "Enrolled", align: "text-right" },
    { key: "presentCount", label: "Present", align: "text-right" },
    { key: "rate", label: "Rate", align: "text-right" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-ocid="analytics.class_table">
        <thead>
          <tr className="border-b border-border">
            {cols.map((col) => (
              <th
                key={col.key}
                className={`py-3 px-4 font-medium text-muted-foreground ${col.align}`}
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="inline-flex items-center hover:text-foreground transition-colors duration-150"
                  data-ocid={`analytics.class_table.sort_${col.key}`}
                >
                  {col.label}
                  <SortIcon col={col.key} />
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((cs, i) => (
            <tr
              key={cs.classId.toString()}
              data-ocid={`analytics.class_table.item.${i + 1}`}
              className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-150"
            >
              <td className="py-3 px-4 font-medium text-foreground">
                {cs.className}
              </td>
              <td className="py-3 px-4 text-right text-muted-foreground">
                {Number(cs.enrolledCount)}
              </td>
              <td className="py-3 px-4 text-right text-muted-foreground">
                {Number(cs.presentCount)}
              </td>
              <td className="py-3 px-4 text-right">
                <Badge
                  variant="secondary"
                  className={`font-mono ${rateColor(cs.rate)}`}
                >
                  {pct(cs.rate)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StudentBarChart({
  stats,
  loading,
}: {
  stats: StudentStat[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div
        data-ocid="analytics.student_chart.empty_state"
        className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2"
      >
        <AlertCircle className="w-8 h-8 opacity-40" />
        <p className="text-sm">No student data for this class / period</p>
      </div>
    );
  }

  const sorted = [...stats].sort((a, b) => b.rate - a.rate);

  return (
    <div className="space-y-2" data-ocid="analytics.student_chart">
      {sorted.map((s, i) => {
        const barPct = Math.round(s.rate * 100);
        const color =
          s.rate >= 0.75
            ? "bg-accent"
            : s.rate >= 0.5
              ? "bg-chart-4"
              : "bg-destructive";
        return (
          <div
            key={s.studentId.toString()}
            data-ocid={`analytics.student_chart.item.${i + 1}`}
            className="flex items-center gap-3"
          >
            <span
              className="w-36 shrink-0 text-sm text-foreground truncate"
              title={s.studentName}
            >
              {s.studentName}
            </span>
            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <span
              className={`w-12 text-right text-sm font-mono font-semibold shrink-0 ${rateColor(s.rate)}`}
            >
              {barPct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function AttendanceAnalytics() {
  const [fromDate, setFromDate] = useState(daysAgoISO(30));
  const [toDate, setToDate] = useState(todayISO());
  const [selectedClassId, setSelectedClassId] = useState<string>("");

  const { data: classes = [], isLoading: classesLoading } = useListClasses();

  const classIdArg: bigint | null = selectedClassId
    ? BigInt(selectedClassId)
    : null;

  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError,
  } = useGetAnalytics(classIdArg, fromDate || null, toDate || null);

  const isLoading = analyticsLoading;

  // Filter studentStats by selected class (backend may return all if no class filter)
  const studentStats = analytics?.studentStats ?? [];

  return (
    <ProtectedRoute requiredRole={Role.teacher}>
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Attendance Analytics
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Insights across all your classes
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2 self-start sm:self-auto"
              onClick={() => analytics && exportCSV(analytics)}
              disabled={!analytics || isLoading}
              data-ocid="analytics.export_button"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Filters */}
          <Card
            className="bg-card border-border"
            data-ocid="analytics.filters.panel"
          >
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-1.5 min-w-[160px]">
                  <Label
                    htmlFor="from-date"
                    className="text-xs text-muted-foreground"
                  >
                    From
                  </Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9"
                    data-ocid="analytics.from_date.input"
                  />
                </div>
                <div className="space-y-1.5 min-w-[160px]">
                  <Label
                    htmlFor="to-date"
                    className="text-xs text-muted-foreground"
                  >
                    To
                  </Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9"
                    data-ocid="analytics.to_date.input"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error state */}
          {isError && (
            <div
              data-ocid="analytics.error_state"
              className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              Failed to load analytics. Please try again.
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={BookOpen}
              label="Total Classes"
              value={
                analytics ? Number(analytics.totalClasses).toString() : "—"
              }
              loading={isLoading}
            />
            <StatCard
              icon={TrendingUp}
              label="Overall Attendance Rate"
              value={analytics ? pct(analytics.overallRate) : "—"}
              sub={
                analytics
                  ? `across ${Number(analytics.totalStudents)} students`
                  : undefined
              }
              loading={isLoading}
            />
            <StatCard
              icon={Users}
              label="Total Students"
              value={
                analytics ? Number(analytics.totalStudents).toString() : "—"
              }
              loading={isLoading}
            />
          </div>

          {/* Per-class breakdown */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base font-semibold">
                Class Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ClassBreakdownTable
                stats={analytics?.classStats ?? []}
                loading={isLoading}
              />
            </CardContent>
          </Card>

          {/* Student performance */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="font-display text-base font-semibold">
                  Student Performance
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="class-select"
                    className="text-xs text-muted-foreground whitespace-nowrap"
                  >
                    Filter class
                  </Label>
                  <select
                    id="class-select"
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    disabled={classesLoading}
                    data-ocid="analytics.class_select"
                  >
                    <option value="">All classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id.toString()} value={cls.id.toString()}>
                        {cls.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <StudentBarChart stats={studentStats} loading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
