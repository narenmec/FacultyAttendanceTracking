
import { useState, useCallback } from 'react';
import { db } from '../firebase/config.ts';
import { FacultyRecord, AttendanceRecord, AttendanceStatus } from '../types.ts';

export interface FacultyWithLop {
  empId: number;
  name: string;
  unpaidLeave: number;
  absentDates: string[];
}

export const useLopReversalData = () => {
  const [facultyWithLop, setFacultyWithLop] = useState<FacultyWithLop[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAndProcessData = useCallback(async (selectedMonth: string, monthlyWorkingDays: number) => {
    if (!selectedMonth || monthlyWorkingDays <= 0) {
        setFacultyWithLop([]);
        return;
    }
    setLoading(true);
    setError(null);

    try {
      const [facultySnapshot, attendanceSnapshot] = await Promise.all([
        db.ref('faculty').get(),
        db.ref('attendance').get()
      ]);

      if (!facultySnapshot.exists()) throw new Error("No faculty data found.");
      
      const facultyList: FacultyRecord[] = [];
      facultySnapshot.forEach(child => {
        facultyList.push({ empId: parseInt(child.key!, 10), ...child.val() });
      });

      const allAttendance: AttendanceRecord[] = [];
      if (attendanceSnapshot.exists()) {
        const attendanceData = attendanceSnapshot.val();
        for (const empId in attendanceData) {
            const records = attendanceData[empId].records || {};
            for (const date in records) {
                if (date.startsWith(selectedMonth)) {
                    allAttendance.push({
                        id: `${date}-${empId}`,
                        empId: parseInt(empId, 10),
                        name: '', 
                        dept: '',
                        date,
                        ...records[date]
                    });
                }
            }
        }
      }

      const processedData: FacultyWithLop[] = [];
      for (const faculty of facultyList) {
        const records = allAttendance.filter(rec => rec.empId === faculty.empId);
        
        const presentDays = records.filter(r => r.status !== AttendanceStatus.Absent).length;
        const absentDays = Math.max(0, monthlyWorkingDays - presentDays);
        
        const casualLeavesAvailable = faculty.casualLeaves || 0;
        const casualLeavesUsed = Math.min(absentDays, casualLeavesAvailable);
        const unpaidLeave = absentDays - casualLeavesUsed;

        if (unpaidLeave > 0) {
          const absentDates = records
            .filter(r => r.status === AttendanceStatus.Absent)
            .map(r => r.date)
            .sort((a,b) => a.localeCompare(b));

          processedData.push({
            empId: faculty.empId,
            name: faculty.name,
            unpaidLeave,
            absentDates,
          });
        }
      }
      setFacultyWithLop(processedData.sort((a,b) => a.name.localeCompare(b.name)));

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred while processing LOP data.");
    } finally {
      setLoading(false);
    }
  }, []);
  
  const reverseLop = useCallback(async (empId: number, date: string) => {
      const recordPath = `attendance/${empId}/records/${date}`;
      try {
          await db.ref(recordPath).update({
              status: AttendanceStatus.OnTime,
              inTime: '08:00:00'
          });
      } catch (err) {
          console.error("Failed to reverse LOP:", err);
          throw new Error("Database update failed. Please try again.");
      }
  }, []);


  return {
    facultyWithLop,
    loading,
    error,
    fetchAndProcessData,
    reverseLop,
  };
};