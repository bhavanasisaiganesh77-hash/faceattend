import Time "mo:core/Time";

module {
  public type StudentId = Principal;
  public type TeacherId = Principal;
  public type ClassId = Nat;
  public type AttendanceId = Nat;

  public type Role = { #student; #teacher };

  public type Profile = {
    id : Principal;
    name : Text;
    role : Role;
    faceImageUrl : Text;
  };

  public type Class = {
    id : ClassId;
    name : Text;
    teacher : TeacherId;
    studentIds : [StudentId];
  };

  // Internal class with mutable student list
  public type ClassInternal = {
    id : ClassId;
    name : Text;
    teacher : TeacherId;
    var studentIds : [StudentId];
  };

  public type AttendanceRecord = {
    id : AttendanceId;
    studentId : StudentId;
    classId : ClassId;
    timestamp : Time.Time;
    dateKey : Text; // "YYYY-MM-DD" used to deduplicate
    confidence : Float;
    source : Text; // "face" | "qr"
  };

  // Analytics return types
  public type ClassStat = {
    classId : ClassId;
    className : Text;
    enrolledCount : Nat;
    presentCount : Nat;
    rate : Float;
  };

  public type StudentStat = {
    studentId : StudentId;
    studentName : Text;
    presentCount : Nat;
    totalSessions : Nat;
    rate : Float;
  };

  public type AnalyticsResult = {
    totalClasses : Nat;
    totalStudents : Nat;
    overallRate : Float;
    classStats : [ClassStat];
    studentStats : [StudentStat]; // non-empty only when classId filter provided
  };
};
