import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { AttendanceRecord, FacultyRecord, MonthlySummary, AttendanceStatus } from '../types';
import { useSettings } from '../components/SettingsContext';

export const useSummaryData = () => {
    const { settings } = useSettings();
    const [rawAttendance, setRawAttendance] = useState<AttendanceRecord[]>([]);
    const [facultyList, setFacultyList] = useState<FacultyRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [monthlyWorkingDays, setMonthlyWorkingDays] = useState<number>(0);
    const [summaryData, setSummaryData] = useState<MonthlySummary[]>([]);

    useEffect(() => {
        // When the selected month changes, update the monthly working days to the total days in that month.
        // The user can still edit this value manually on the summary page.
        if (selectedMonth) {
            const [year, month] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            setMonthlyWorkingDays(daysInMonth);
        }
    }, [selectedMonth]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch both faculty and attendance data in parallel
                const facultyRef = db.ref('faculty');
                const attendanceRef = db.ref('attendance');

                const [facultySnapshot, attendanceSnapshot] = await Promise.all([
                    facultyRef.get(),
                    attendanceRef.get()
                ]);

                // Process faculty data
                const loadedFaculty: FacultyRecord[] = [];
                if (facultySnapshot.exists()) {
                    const dataFromDb = facultySnapshot.val();
                    for (const empId in dataFromDb) {
                        loadedFaculty.push({ empId: parseInt(empId, 10), ...dataFromDb[empId] });
                    }
                }
                setFacultyList(loadedFaculty.sort((a, b) => a.name.localeCompare(b.name)));

                // Process attendance data
                const flattenedData: AttendanceRecord[] = [];
                if (attendanceSnapshot.exists()) {
                    const facultyMap = new Map(loadedFaculty.map(f => [String(f.empId), f]));
                    const dataFromDb = attendanceSnapshot.val();
                    for (const empId in dataFromDb) {
                        const facultyDetails = facultyMap.get(empId) || { name: `Unknown (${empId})`, dept: 'Unknown', designation: 'N/A', salary: 0 };
                        const { records } = dataFromDb[empId];
                        if (records) {
                            for (const date in records) {
                                const record = records[date];
                                flattenedData.push({
                                    id: `${date}-${empId}`,
                                    empId: parseInt(empId, 10),
                                    name: facultyDetails.name,
                                    dept: facultyDetails.dept,
                                    date,
                                    inTime: record.inTime,
                                    status: record.status,
                                });
                            }
                        }
                    }
                }
                setRawAttendance(flattenedData);

            } catch (err) {
                console.error("Error fetching summary data: ", err);
                setError("Failed to load data for summary calculation.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const calculateSummary = useCallback(() => {
        if (!facultyList.length || monthlyWorkingDays <= 0) {
            setSummaryData([]);
            return;
        }

        const attendanceForMonth = rawAttendance.filter(rec => rec.date.startsWith(selectedMonth));
        const attendanceByEmpId = new Map<number, AttendanceRecord[]>();
        attendanceForMonth.forEach(rec => {
            if (!attendanceByEmpId.has(rec.empId)) {
                attendanceByEmpId.set(rec.empId, []);
            }
            attendanceByEmpId.get(rec.empId)!.push(rec);
        });

        const newSummaryData = facultyList.map(faculty => {
            const records = attendanceByEmpId.get(faculty.empId) || [];
            const presentDays = records.filter(r => r.status !== AttendanceStatus.Absent).length;
            const lateRecords = records.filter(r => r.status === AttendanceStatus.Late).length;

            const permissions = Math.min(lateRecords, settings.permissionLimit);
            const halfDayLeaves = Math.max(0, lateRecords - settings.permissionLimit);
            const fullDayLeaves = Math.max(0, monthlyWorkingDays - presentDays);
            const totalLeaves = fullDayLeaves + (0.5 * halfDayLeaves);
            const payableDays = Math.max(0, monthlyWorkingDays - totalLeaves);
            
            const calculatedSalary = faculty.salary > 0 && monthlyWorkingDays > 0
                ? (payableDays / monthlyWorkingDays) * faculty.salary
                : 0;

            return {
                empId: faculty.empId,
                name: faculty.name,
                dept: faculty.dept,
                designation: faculty.designation,
                monthlySalary: faculty.salary,
                presentDays,
                permissions,
                halfDayLeaves,
                fullDayLeaves,
                totalLeaves,
                payableDays,
                calculatedSalary: parseFloat(calculatedSalary.toFixed(2)),
            };
        });

        setSummaryData(newSummaryData);
    }, [facultyList, rawAttendance, selectedMonth, monthlyWorkingDays, settings.permissionLimit]);

    useEffect(() => {
        calculateSummary();
    }, [calculateSummary]);

    const updatePayableDays = useCallback((empId: number, newPayableDays: number) => {
        setSummaryData(prevData => {
            return prevData.map(item => {
                if (item.empId === empId) {
                    const faculty = facultyList.find(f => f.empId === empId);
                    const salary = faculty ? faculty.salary : 0;
                    const newCalculatedSalary = salary > 0 && monthlyWorkingDays > 0
                        ? (newPayableDays / monthlyWorkingDays) * salary
                        : 0;
                    
                    return { 
                        ...item, 
                        payableDays: newPayableDays,
                        calculatedSalary: parseFloat(newCalculatedSalary.toFixed(2)),
                    };
                }
                return item;
            });
        });
    }, [monthlyWorkingDays, facultyList]);
    
    return {
        summaryData,
        loading,
        error,
        clearError: () => setError(null),
        selectedMonth,
        setSelectedMonth,
        monthlyWorkingDays,
        setMonthlyWorkingDays,
        recalculate: calculateSummary,
        updatePayableDays,
    };
};
