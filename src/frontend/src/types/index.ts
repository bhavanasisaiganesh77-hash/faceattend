import type { Role } from "@/backend";
import type { Principal } from "@icp-sdk/core/principal";
export type {
  Role,
  Profile,
  Class,
  AttendanceRecord,
  ClassId,
  AttendanceId,
  StudentId,
  TeacherId,
} from "@/backend";
export { Role as RoleEnum } from "@/backend";

export type AppRole = "student" | "teacher";

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface ProfileSetupData {
  name: string;
  role: Role;
  faceImageUrl: string;
}
