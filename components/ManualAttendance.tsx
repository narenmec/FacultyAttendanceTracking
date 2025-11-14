import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { FacultyRecord, AttendanceRecord, AttendanceStatus } from '../types';
import { Calendar, Loader2 } from 'lucide-react';

type FacultyWithAttendance = FacultyRecord & {
  status: AttendanceStatus | 'Not Marked';
  inTime?: string;
};

const ManualAttendance: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [facultyWithAttendance, setFacultyWithAttendance] = useState<FacultyWithAttendance[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState<{ [empId: number]: boolean }>({});
  const [error, setError] = useState<string | null>(null);

  const fetchDataForDate = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const facultyRef = db.ref('faculty');
      const attendanceRef = db.ref('attendance');

      const [facultySnapshot, attendanceSnapshot] = await Promise.all([
        facultyRef.get(),
        attendanceRef.get()
      ]);

      if (!facultySnapshot.exists()) {
        throw new Error("No faculty data found in the database.");
      }

      const facultyList: FacultyRecord[] = [];
      const facultyData = facultySnapshot.val();
      for (const empId in facultyData) {
        facultyList.push({ empId: parseInt(empId, 10), ...facultyData[empId] });
      }
      
      const attendanceForDate = new Map<number, { status: AttendanceStatus, inTime: string }>();
      if (attendanceSnapshot.exists()) {
          const allAttendanceData = attendanceSnapshot.val();
          for(const empId in allAttendanceData) {
              if(allAttendanceData[empId].records && allAttendanceData[empId].records[date]) {
                  const record = allAttendanceData[empId].records[date];
                  attendanceForDate.set(parseInt(empId, 10), { status: record.status as AttendanceStatus, inTime: record.inTime });
              }
          }
      }

      const mergedData = facultyList.map((faculty): FacultyWithAttendance => {
        const attendance = attendanceForDate.get(faculty.empId);
        return {
          ...faculty,
          status: attendance ? attendance.status : 'Not Marked',
          inTime: attendance ? attendance.inTime : undefined,
        };
      });

      // Sort the data based on user request
      const statusSortOrder: { [key in AttendanceStatus | 'Not Marked']: number } = {
        'Not Marked': 1,
        [AttendanceStatus.Late]: 2,
        [AttendanceStatus.OnTime]: 3,
        [AttendanceStatus.Absent]: 4,
        [AttendanceStatus.OnDuty]: 5,
      };

      mergedData.sort((a, b) => {
        const statusA_Order = statusSortOrder[a.status];
        const statusB_Order = statusSortOrder[b.status];
        if (statusA_Order !== statusB_Order) {
            return statusA_Order - statusB_Order;
        }
        return a.name.localeCompare(b.name); // Secondary sort by name
      });

      setFacultyWithAttendance(mergedData);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataForDate(selectedDate);
  }, [selectedDate, fetchDataForDate]);

  const handleMarkAttendance = async (empId: number, markAs: 'Present' | 'Leave' | 'On-Duty') => {
    setUpdatingStatus(prev => ({ ...prev, [empId]: true }));
    
    const currentFaculty = facultyWithAttendance.find(f => f.empId === empId);
    if (!currentFaculty) {
        console.error("Could not find faculty member to update.");
        setUpdatingStatus(prev => ({ ...prev, [empId]: false }));
        return;
    }

    try {
        const recordPath = `attendance/${empId}/records/${selectedDate}`;

        let newStatus: AttendanceStatus;
        switch(markAs) {
            case 'Present': newStatus = AttendanceStatus.OnTime; break;
            case 'Leave': newStatus = AttendanceStatus.Absent; break;
            case 'On-Duty': newStatus = AttendanceStatus.OnDuty; break;
        }

        if (currentFaculty.status === AttendanceStatus.Late) {
            await db.ref(`${recordPath}/status`).set(newStatus);
            setFacultyWithAttendance(prev => 
                prev.map(f => 
                    f.empId === empId ? { ...f, status: newStatus } : f
                )
            );
        } else {
            let newInTime: string;
            if (markAs === 'Present') {
                newInTime = '08:00:00'; 
            } else {
                newInTime = '00:00:00';
            }
            const newRecord = { status: newStatus, inTime: newInTime };
            await db.ref(recordPath).set(newRecord);

            setFacultyWithAttendance(prev => 
                prev.map(f => 
                    f.empId === empId ? { ...f, ...newRecord } : f
                )
            );
        }
    } catch (err) {
        console.error("Failed to mark attendance:", err);
        alert("Failed to update attendance. Please check console for errors.");
    } finally {
        setUpdatingStatus(prev => ({ ...prev, [empId]: false }));
    }
  };

  const getStatusBadge = (status: AttendanceStatus | 'Not Marked') => {
    switch(status) {
        case AttendanceStatus.OnTime: return 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300';
        case AttendanceStatus.Late: return 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300';
        case AttendanceStatus.OnDuty: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300';
        case AttendanceStatus.Absent: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300';
        case 'Not Marked': return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200';
        default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-primary dark:bg-gray-900/80 rounded-lg border border-accent dark:border-gray-700">
            <h3 className="text-lg font-semibold text-text-primary dark:text-gray-200">
                Select Date
            </h3>
            <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400" />
                <input
                    id="manual-attendance-date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-auto bg-secondary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    aria-label="Select attendance date"
                />
            </div>
        </div>

        {loading ? (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-highlight" />
             </div>
        ) : error ? (
            <div className="text-red-600 dark:text-red-400 text-center py-10">{error}</div>
        ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {facultyWithAttendance.map(faculty => (
                    <div key={faculty.empId} className="bg-primary dark:bg-gray-900 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-1">
                            <p className="font-semibold text-text-primary dark:text-gray-200">{faculty.name}</p>
                            <p className="text-sm text-text-secondary dark:text-gray-400">ID: {faculty.empId} | Dept: {faculty.dept}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusBadge(faculty.status)}`}>
                                {faculty.status}
                            </span>
                             <div className="w-64 flex justify-end">
                                {faculty.status === 'Not Marked' || faculty.status === AttendanceStatus.Absent || faculty.status === AttendanceStatus.Late ? (
                                    updatingStatus[faculty.empId] ? (
                                        <Loader2 className="h-5 w-5 animate-spin"/>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleMarkAttendance(faculty.empId, 'Present')} className="px-3 py-1 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors">Present</button>
                                            <button onClick={() => handleMarkAttendance(faculty.empId, 'Leave')} className="px-3 py-1 text-sm rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors">Leave</button>
                                            <button onClick={() => handleMarkAttendance(faculty.empId, 'On-Duty')} className="px-3 py-1 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors">On-Duty</button>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-sm text-text-secondary dark:text-gray-500 italic">Record exists</p>
                                )}
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default ManualAttendance;