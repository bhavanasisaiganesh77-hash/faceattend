import { type AnalyticsResult, createActor } from "@/backend";
import type { AttendanceRecord, Class, ClassId, Profile } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useListClasses() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Class[]>({
    queryKey: ["classes"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listClasses();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useListStudents() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Profile[]>({
    queryKey: ["students"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listStudents();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateClass() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createClass(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useJoinClass() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (classId: ClassId) => {
      if (!actor) throw new Error("Actor not available");
      return actor.joinClass(classId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
}

export function useGetClassAttendance(
  classId: ClassId | null,
  dateKey: string,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AttendanceRecord[]>({
    queryKey: ["classAttendance", classId?.toString(), dateKey],
    queryFn: async () => {
      if (!actor || !classId) return [];
      return actor.getClassAttendance(classId, dateKey);
    },
    enabled: !!actor && !isFetching && classId !== null,
  });
}

export function useGetMyAttendance() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AttendanceRecord[]>({
    queryKey: ["myAttendance"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyAttendance();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMarkAttendance() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      classId: ClassId;
      studentId: string;
      confidence: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const { Principal } = await import("@icp-sdk/core/principal");
      return actor.markAttendance(
        data.classId,
        Principal.fromText(data.studentId),
        data.confidence,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classAttendance"] });
      queryClient.invalidateQueries({ queryKey: ["myAttendance"] });
    },
  });
}

export function useGetAnalytics(
  classId: bigint | null,
  fromDate: string | null,
  toDate: string | null,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<AnalyticsResult>({
    queryKey: ["analytics", classId?.toString() ?? null, fromDate, toDate],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getAnalytics(
        classId ?? null,
        fromDate ?? null,
        toDate ?? null,
      );
    },
    enabled: !!actor && !isFetching,
  });
}
