import Time "mo:core/Time";
import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import Types "../types/attendance";

module {

  // ---------- Profile helpers ----------

  public func getProfile(
    profiles : Map.Map<Principal, Types.Profile>,
    id : Principal,
  ) : ?Types.Profile {
    profiles.get(id);
  };

  public func upsertProfile(
    profiles : Map.Map<Principal, Types.Profile>,
    profile : Types.Profile,
  ) : () {
    profiles.add(profile.id, profile);
  };

  public func listProfiles(
    profiles : Map.Map<Principal, Types.Profile>,
  ) : [Types.Profile] {
    profiles.values().toArray();
  };

  // ---------- Class helpers ----------

  public func createClass(
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
    state : { var nextClassId : Nat },
    teacher : Principal,
    name : Text,
  ) : Types.ClassId {
    let id = state.nextClassId;
    state.nextClassId += 1;
    let cls : Types.ClassInternal = {
      id;
      name;
      teacher;
      var studentIds = [];
    };
    classes.add(id, cls);
    id;
  };

  public func joinClass(
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
    classId : Types.ClassId,
    student : Principal,
  ) : Bool {
    switch (classes.get(classId)) {
      case null { false };
      case (?cls) {
        let alreadyIn = cls.studentIds.find(func(s : Principal) : Bool {
          Principal.equal(s, student)
        });
        switch alreadyIn {
          case (?_) { true };
          case null {
            cls.studentIds := cls.studentIds.concat([student]);
            true;
          };
        };
      };
    };
  };

  public func getClass(
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
    classId : Types.ClassId,
  ) : ?Types.Class {
    switch (classes.get(classId)) {
      case null { null };
      case (?cls) {
        ?{
          id = cls.id;
          name = cls.name;
          teacher = cls.teacher;
          studentIds = cls.studentIds;
        };
      };
    };
  };

  public func listClasses(
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
  ) : [Types.Class] {
    classes.values().map<Types.ClassInternal, Types.Class>(func(cls) {
      {
        id = cls.id;
        name = cls.name;
        teacher = cls.teacher;
        studentIds = cls.studentIds;
      }
    }).toArray();
  };

  public func studentsInClass(
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
    classId : Types.ClassId,
  ) : [Types.StudentId] {
    switch (classes.get(classId)) {
      case null { [] };
      case (?cls) { cls.studentIds };
    };
  };

  // ---------- Attendance helpers ----------

  /// Returns null if duplicate (already marked today), otherwise new record id
  public func markAttendance(
    records : List.List<Types.AttendanceRecord>,
    state : { var nextAttendanceId : Nat },
    studentId : Principal,
    classId : Types.ClassId,
    confidence : Float,
  ) : ?Types.AttendanceId {
    let now = Time.now();
    let dk = toDateKey(now);
    let duplicate = records.find(func(r : Types.AttendanceRecord) : Bool {
      Principal.equal(r.studentId, studentId) and r.classId == classId and r.dateKey == dk
    });
    switch duplicate {
      case (?_) { null };
      case null {
        let id = state.nextAttendanceId;
        state.nextAttendanceId += 1;
        let rec : Types.AttendanceRecord = {
          id;
          studentId;
          classId;
          timestamp = now;
          dateKey = dk;
          confidence;
          source = "face";
        };
        records.add(rec);
        ?id;
      };
    };
  };

  public func getAttendanceForClass(
    records : List.List<Types.AttendanceRecord>,
    classId : Types.ClassId,
    dateKey : Text,
  ) : [Types.AttendanceRecord] {
    records.filter(func(r : Types.AttendanceRecord) : Bool {
      r.classId == classId and r.dateKey == dateKey
    }).toArray();
  };

  public func getStudentHistory(
    records : List.List<Types.AttendanceRecord>,
    studentId : Principal,
  ) : [Types.AttendanceRecord] {
    records.filter(func(r : Types.AttendanceRecord) : Bool {
      Principal.equal(r.studentId, studentId)
    }).toArray();
  };

  /// Mark attendance via QR scan — same duplicate rules as markAttendance
  public func markAttendanceQR(
    records : List.List<Types.AttendanceRecord>,
    state : { var nextAttendanceId : Nat },
    studentId : Principal,
    classId : Types.ClassId,
  ) : ?Types.AttendanceId {
    let now = Time.now();
    let dk = toDateKey(now);
    let duplicate = records.find(func(r : Types.AttendanceRecord) : Bool {
      Principal.equal(r.studentId, studentId) and r.classId == classId and r.dateKey == dk
    });
    switch duplicate {
      case (?_) { null };
      case null {
        let id = state.nextAttendanceId;
        state.nextAttendanceId += 1;
        let rec : Types.AttendanceRecord = {
          id;
          studentId;
          classId;
          timestamp = now;
          dateKey = dk;
          confidence = 1.0;
          source = "qr";
        };
        records.add(rec);
        ?id;
      };
    };
  };

  /// Compute analytics — optionally filtered by classId and/or date range
  public func getAnalytics(
    profiles : Map.Map<Principal, Types.Profile>,
    classes : Map.Map<Types.ClassId, Types.ClassInternal>,
    records : List.List<Types.AttendanceRecord>,
    filterClassId : ?Types.ClassId,
    fromDate : ?Text,
    toDate : ?Text,
  ) : Types.AnalyticsResult {
    // Filter records by date range
    let filteredRecords = records.filter(func(r : Types.AttendanceRecord) : Bool {
      let afterFrom = switch fromDate {
        case null { true };
        case (?from) { r.dateKey >= from };
      };
      let beforeTo = switch toDate {
        case null { true };
        case (?to) { r.dateKey <= to };
      };
      afterFrom and beforeTo
    });

    let totalClasses = classes.size();
    let totalStudents = profiles.values().filter(
      func(p : Types.Profile) : Bool { p.role == #student }
    ).size();

    // Build per-class stats using Iter.map on classes
    let classStatsArr = classes.values().map(
      func(cls) {
        let enrolledCount = cls.studentIds.size();
        let presentCount = filteredRecords.filter(
          func(r : Types.AttendanceRecord) : Bool { r.classId == cls.id }
        ).size();
        let rate : Float = if (enrolledCount == 0) { 0.0 } else {
          presentCount.toFloat() / enrolledCount.toFloat()
        };
        { classId = cls.id; className = cls.name; enrolledCount; presentCount; rate };
      }
    ).toArray();

    // Compute overall rate
    let totalPresent = filteredRecords.size();
    let overallRate : Float = if (totalStudents == 0 or totalClasses == 0) { 0.0 } else {
      let maxPossible = totalStudents * totalClasses;
      totalPresent.toFloat() / maxPossible.toFloat()
    };

    // Per-student stats only when a classId filter is provided
    let studentStatsArr : [Types.StudentStat] = switch filterClassId {
      case null { [] };
      case (?cid) {
        switch (classes.get(cid)) {
          case null { [] };
          case (?cls) {
            // Count distinct session dates for this class
            let sessionDates = Map.empty<Text, Bool>();
            filteredRecords.filter(
              func(r : Types.AttendanceRecord) : Bool { r.classId == cid }
            ).values().forEach(func(r : Types.AttendanceRecord) {
              sessionDates.add(r.dateKey, true);
            });
            let totalSessions = sessionDates.size();
            cls.studentIds.values().map<Principal, Types.StudentStat>(
              func(sid) {
                let name = switch (profiles.get(sid)) {
                  case (?p) { p.name };
                  case null { "Unknown" };
                };
                let presentCount = filteredRecords.filter(
                  func(r : Types.AttendanceRecord) : Bool {
                    Principal.equal(r.studentId, sid) and r.classId == cid
                  }
                ).size();
                let rate : Float = if (totalSessions == 0) { 0.0 } else {
                  presentCount.toFloat() / totalSessions.toFloat()
                };
                { studentId = sid; studentName = name; presentCount; totalSessions; rate };
              }
            ).toArray();
          };
        };
      };
    };

    {
      totalClasses;
      totalStudents;
      overallRate;
      classStats = classStatsArr;
      studentStats = studentStatsArr;
    };
  };

  // ---------- Utility ----------

  /// Converts a nanosecond timestamp to "YYYY-MM-DD" date key (UTC)
  public func toDateKey(timestampNs : Time.Time) : Text {
    let secondsInt = timestampNs / 1_000_000_000;
    let seconds = if (secondsInt < 0) { 0 } else { secondsInt.toNat() };
    let day = seconds / 86400;
    // Proleptic Gregorian calendar from day-of-epoch
    let z = day + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if (mp < 10) { mp + 3 } else { mp - 9 };
    let yr = if (m <= 2) { y + 1 } else { y };
    let mStr = if (m < 10) { "0" # m.toText() } else { m.toText() };
    let dStr = if (d < 10) { "0" # d.toText() } else { d.toText() };
    yr.toText() # "-" # mStr # "-" # dStr;
  };
};
