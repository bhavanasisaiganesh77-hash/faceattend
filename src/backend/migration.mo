import List "mo:core/List";
import Map "mo:core/Map";
import Types "./types/attendance";

module {
  // Old AttendanceRecord type (without source field)
  type OldAttendanceRecord = {
    id : Nat;
    studentId : Principal;
    classId : Nat;
    timestamp : Int;
    dateKey : Text;
    confidence : Float;
  };

  // Old ClassInternal type
  type OldClassInternal = {
    id : Nat;
    name : Text;
    teacher : Principal;
    var studentIds : [Principal];
  };

  // Old Profile type
  type OldProfile = {
    id : Principal;
    name : Text;
    role : { #student; #teacher };
    faceImageUrl : Text;
  };

  // Old UserRole type (from authorization extension)
  type OldUserRole = { #admin; #guest; #user };

  type OldAccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, OldUserRole>;
  };

  type OldActor = {
    accessControlState : OldAccessControlState;
    profiles : Map.Map<Principal, OldProfile>;
    classes : Map.Map<Nat, OldClassInternal>;
    records : List.List<OldAttendanceRecord>;
    state : { var nextClassId : Nat; var nextAttendanceId : Nat };
  };

  type NewActor = {
    accessControlState : OldAccessControlState;
    profiles : Map.Map<Principal, Types.Profile>;
    classes : Map.Map<Types.ClassId, Types.ClassInternal>;
    records : List.List<Types.AttendanceRecord>;
    state : { var nextClassId : Nat; var nextAttendanceId : Nat };
  };

  public func run(old : OldActor) : NewActor {
    // Migrate attendance records: add source = "face" to all existing records
    let newRecords = List.empty<Types.AttendanceRecord>();
    for (r in old.records.values()) {
      newRecords.add({
        id = r.id;
        studentId = r.studentId;
        classId = r.classId;
        timestamp = r.timestamp;
        dateKey = r.dateKey;
        confidence = r.confidence;
        source = "face";
      });
    };

    {
      accessControlState = old.accessControlState;
      profiles = old.profiles;
      classes = old.classes;
      records = newRecords;
      state = old.state;
    };
  };
};
