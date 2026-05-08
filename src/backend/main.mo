import Map "mo:core/Map";
import List "mo:core/List";
import Principal "mo:core/Principal";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Types "types/attendance";
import AttendanceMixin "mixins/attendance-api";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Attendance domain state
  let profiles = Map.empty<Principal, Types.Profile>();
  let classes = Map.empty<Types.ClassId, Types.ClassInternal>();
  let records = List.empty<Types.AttendanceRecord>();
  let state = { var nextClassId : Nat = 0; var nextAttendanceId : Nat = 0 };

  include AttendanceMixin(accessControlState, profiles, classes, records, state);
};
