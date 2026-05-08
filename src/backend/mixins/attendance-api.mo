import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/attendance";
import AttendanceLib "../lib/attendance";

mixin (
  accessControlState : AccessControl.AccessControlState,
  profiles : Map.Map<Principal, Types.Profile>,
  classes : Map.Map<Types.ClassId, Types.ClassInternal>,
  records : List.List<Types.AttendanceRecord>,
  state : { var nextClassId : Nat; var nextAttendanceId : Nat },
) {

  // ------ Profile endpoints ------

  /// Register or update the caller's profile (name, role, faceImageUrl)
  public shared ({ caller }) func saveProfile(name : Text, role : Types.Role, faceImageUrl : Text) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    let profile : Types.Profile = { id = caller; name; role; faceImageUrl };
    AttendanceLib.upsertProfile(profiles, profile);
  };

  /// Get the caller's own profile
  public query ({ caller }) func getMyProfile() : async ?Types.Profile {
    AttendanceLib.getProfile(profiles, caller);
  };

  /// List all student profiles — teachers only
  public query ({ caller }) func listStudents() : async [Types.Profile] {
    switch (AttendanceLib.getProfile(profiles, caller)) {
      case (?p) {
        if (p.role != #teacher) { Runtime.trap("Unauthorized: Teachers only") };
      };
      case null { Runtime.trap("Unauthorized: Profile not found") };
    };
    let all = AttendanceLib.listProfiles(profiles);
    all.filter(func(p : Types.Profile) : Bool { p.role == #student });
  };

  // ------ Class endpoints ------

  /// Create a new class — teachers only
  public shared ({ caller }) func createClass(name : Text) : async Types.ClassId {
    switch (AttendanceLib.getProfile(profiles, caller)) {
      case (?p) {
        if (p.role != #teacher) { Runtime.trap("Unauthorized: Teachers only") };
      };
      case null { Runtime.trap("Unauthorized: Profile not found") };
    };
    AttendanceLib.createClass(classes, state, caller, name);
  };

  /// Student joins an existing class
  public shared ({ caller }) func joinClass(classId : Types.ClassId) : async Bool {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    AttendanceLib.joinClass(classes, classId, caller);
  };

  /// List all classes
  public query ({ caller }) func listClasses() : async [Types.Class] {
    AttendanceLib.listClasses(classes);
  };

  /// List students enrolled in a class
  public query ({ caller }) func listClassStudents(classId : Types.ClassId) : async [Types.StudentId] {
    AttendanceLib.studentsInClass(classes, classId);
  };

  // ------ Attendance endpoints ------

  /// Mark attendance for a student in a class (called after face match)
  /// Returns null if already marked today (duplicate prevention)
  public shared ({ caller }) func markAttendance(classId : Types.ClassId, studentId : Principal, confidence : Float) : async ?Types.AttendanceId {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    AttendanceLib.markAttendance(records, state, studentId, classId, confidence);
  };

  /// Get attendance records for a class on a given date (YYYY-MM-DD)
  public query ({ caller }) func getClassAttendance(classId : Types.ClassId, dateKey : Text) : async [Types.AttendanceRecord] {
    AttendanceLib.getAttendanceForClass(records, classId, dateKey);
  };

  /// Get the caller student's own attendance history
  public query ({ caller }) func getMyAttendance() : async [Types.AttendanceRecord] {
    AttendanceLib.getStudentHistory(records, caller);
  };

  /// Mark attendance via QR scan — student marks their own attendance
  /// Returns null if already marked today (duplicate prevention)
  public shared ({ caller }) func markMyAttendanceQR(classId : Types.ClassId) : async ?Types.AttendanceId {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    switch (AttendanceLib.getProfile(profiles, caller)) {
      case (?p) {
        if (p.role != #student) { Runtime.trap("Unauthorized: Students only") };
      };
      case null { Runtime.trap("Unauthorized: Profile not found") };
    };
    AttendanceLib.markAttendanceQR(records, state, caller, classId);
  };

  /// Get analytics — teachers only
  public query ({ caller }) func getAnalytics(classId : ?Types.ClassId, fromDate : ?Text, toDate : ?Text) : async Types.AnalyticsResult {
    switch (AttendanceLib.getProfile(profiles, caller)) {
      case (?p) {
        if (p.role != #teacher) { Runtime.trap("Unauthorized: Teachers only") };
      };
      case null { Runtime.trap("Unauthorized: Profile not found") };
    };
    AttendanceLib.getAnalytics(profiles, classes, records, classId, fromDate, toDate);
  };
};
