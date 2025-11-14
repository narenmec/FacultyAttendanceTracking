export enum AttendanceStatus {
  OnTime = 'On-time',
  Late = 'Late',
  Absent = 'Absent',
  OnDuty = 'On-Duty',
}

export interface AttendanceRecord {
  id: string;
  empId: number;
  name: string;
  dept: string;
  inTime: string;
  status: AttendanceStatus;
  date: string;
}

export interface FacultyRecord {
  empId: number;
  name: string;
  dept: string;
  designation: string;
  salary: number;
}

export interface ChartData {
  name: string;
  value: number;
  // Fix: Add index signature to make the type compatible with Recharts' data prop.
  [key: string]: any;
}

export interface DepartmentChartData {
    name: string;
    [AttendanceStatus.OnTime]: number;
    [AttendanceStatus.Late]: number;
    [AttendanceStatus.Absent]: number;
    [AttendanceStatus.OnDuty]: number;
}

export interface FacultySummaryRecord {
  empId: number;
  name: string;
  onTime: number;
  late: number;
  absent: number;
  totalDays: number;
}

export interface MonthlySummary {
  empId: number;
  name: string;
  dept: string;
  designation: string;
  monthlySalary: number;
  presentDays: number;
  permissions: number;
  halfDayLeaves: number;
  fullDayLeaves: number;
  totalLeaves: number;
  payableDays: number;
  calculatedSalary: number;
}

export interface Settings {
  onTimeThreshold: string;
  permissionLimit: number;
}
