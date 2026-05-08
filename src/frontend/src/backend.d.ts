import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Class {
    id: ClassId;
    name: string;
    teacher: TeacherId;
    studentIds: Array<StudentId>;
}
export interface AttendanceRecord {
    id: AttendanceId;
    dateKey: string;
    studentId: StudentId;
    source: string;
    classId: ClassId;
    timestamp: Time;
    confidence: number;
}
export type AttendanceId = bigint;
export type Time = bigint;
export interface AnalyticsResult {
    totalClasses: bigint;
    studentStats: Array<StudentStat>;
    totalStudents: bigint;
    overallRate: number;
    classStats: Array<ClassStat>;
}
export interface StudentStat {
    studentId: StudentId;
    studentName: string;
    rate: number;
    presentCount: bigint;
    totalSessions: bigint;
}
export type ClassId = bigint;
export interface Profile {
    id: Principal;
    name: string;
    role: Role;
    faceImageUrl: string;
}
export interface ClassStat {
    rate: number;
    classId: ClassId;
    presentCount: bigint;
    className: string;
    enrolledCount: bigint;
}
export type StudentId = Principal;
export type TeacherId = Principal;
export enum Role {
    teacher = "teacher",
    student = "student"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createClass(name: string): Promise<ClassId>;
    getAnalytics(classId: ClassId | null, fromDate: string | null, toDate: string | null): Promise<AnalyticsResult>;
    getCallerUserRole(): Promise<UserRole>;
    getClassAttendance(classId: ClassId, dateKey: string): Promise<Array<AttendanceRecord>>;
    getMyAttendance(): Promise<Array<AttendanceRecord>>;
    getMyProfile(): Promise<Profile | null>;
    isCallerAdmin(): Promise<boolean>;
    joinClass(classId: ClassId): Promise<boolean>;
    listClassStudents(classId: ClassId): Promise<Array<StudentId>>;
    listClasses(): Promise<Array<Class>>;
    listStudents(): Promise<Array<Profile>>;
    markAttendance(classId: ClassId, studentId: Principal, confidence: number): Promise<AttendanceId | null>;
    markMyAttendanceQR(classId: ClassId): Promise<AttendanceId | null>;
    saveProfile(name: string, role: Role, faceImageUrl: string): Promise<void>;
}
