import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config.ts';
import { AttendanceRecord, FacultyRecord, MonthlySummary, AttendanceStatus, Holiday } from '../types.ts';
import { useSettings } from '../components/SettingsContext.tsx';

export const useSummaryData = () => {
    const { settings } = useSettings();
    const [rawAttendance, setRawAttendance] = useState<AttendanceRecord[]>([]);
    const [facultyList, setFacultyList] = useState<FacultyRecord[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
    const [monthlyWorkingDays, setMonthlyWorkingDays] = useState<number>(0);
    const [summaryData, setSummaryData] = useState<MonthlySummary[]>([]);

    const [isAllocationRun, setIsAllocationRun] = useState<boolean>(false);
    const [isCheckingAllocation, setIsCheckingAllocation] = useState<boolean>(true);

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
        const checkAllocationStatus = async () => {
            if (!selectedMonth) return;
            setIsCheckingAllocation(true);
            setIsAllocationRun(false); // Reset on month change
            try {
                const allocationRef = db.ref(`monthlyAllocations/${selectedMonth}`);
                const snapshot = await allocationRef.get();
                if (snapshot.exists() && snapshot.val().completed) {
                    setIsAllocationRun(true);
                } else {
                    setIsAllocationRun(false);
                }
            } catch (err) {
                console.error("Error checking allocation status:", err);
                setIsAllocationRun(false); // Assume not run if error
            } finally {
                setIsCheckingAllocation(false);
            }
        };

        checkAllocationStatus();
    }, [selectedMonth]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all data in parallel
                const facultyRef = db.ref('faculty');
                const attendanceRef = db.ref('attendance');
                const holidaysRef = db.ref('holidays');

                const [facultySnapshot, attendanceSnapshot, holidaysSnapshot] = await Promise.all([
                    facultyRef.get(),
                    attendanceRef.get(),
                    holidaysRef.get()
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
                                    leaveApplicationId: record.leaveApplicationId,
                                });
                            }
                        }
                    }
                }
                setRawAttendance(flattenedData);

                // Process holiday data
                const loadedHolidays: Holiday[] = [];
                if (holidaysSnapshot.exists()) {
                    const dataFromDb = holidaysSnapshot.val();
                    for (const id in dataFromDb) {
                        loadedHolidays.push({ id, ...dataFromDb[id] });
                    }
                }
                setHolidays(loadedHolidays);

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
        
        const holidaysInMonth = holidays.filter(h => h.date.startsWith(selectedMonth)).length;
        const actualWorkingDays = Math.max(0, monthlyWorkingDays - holidaysInMonth);

        const newSummaryData = facultyList.map(faculty => {
            const records = attendanceByEmpId.get(faculty.empId) || [];
            
            // Core leave calculation logic
            const presentDays = records.filter(r => r.status !== AttendanceStatus.Absent).length;
            const absentDays = Math.max(0, actualWorkingDays - presentDays);
            const casualLeavesAvailable = faculty.casualLeaves || 0;
            const casualLeavesUsed = Math.min(absentDays, casualLeavesAvailable);
            const unpaidLeave = absentDays - casualLeavesUsed;

            // Late record logic for permissions
            const lateRecords = records.filter(r => r.status === AttendanceStatus.Late).length;
            const permissions = Math.min(lateRecords, settings.permissionLimit);
            const halfDayLeaves = Math.max(0, lateRecords - settings.permissionLimit);
            
            // Final salary calculation
            const totalLeaves = unpaidLeave + (0.5 * halfDayLeaves);
            const payableDays = Math.max(0, actualWorkingDays - totalLeaves);
            
            const calculatedSalary = faculty.salary > 0 && actualWorkingDays > 0
                ? (payableDays / actualWorkingDays) * faculty.salary
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
                casualLeavesAvailable,
                casualLeavesUsed,
                unpaidLeave,
                totalLeaves,
                payableDays,
                calculatedSalary: parseFloat(calculatedSalary.toFixed(2)),
            };
        });

        setSummaryData(newSummaryData);
    }, [facultyList, rawAttendance, holidays, selectedMonth, monthlyWorkingDays, settings.permissionLimit]);

    useEffect(() => {
        calculateSummary();
    }, [calculateSummary]);

    const updatePayableDays = useCallback((empId: number, newPayableDays: number) => {
        setSummaryData(prevData => {
            return prevData.map(item => {
                if (item.empId === empId) {
                    const faculty = facultyList.find(f => f.empId === empId);
                    const salary = faculty ? faculty.salary : 0;
                    
                    const holidaysInMonth = holidays.filter(h => h.date.startsWith(selectedMonth)).length;
                    const actualWorkingDays = Math.max(0, monthlyWorkingDays - holidaysInMonth);
                    
                    const newCalculatedSalary = salary > 0 && actualWorkingDays > 0
                        ? (newPayableDays / actualWorkingDays) * salary
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
    }, [monthlyWorkingDays, facultyList, holidays, selectedMonth]);

    const finalizeAndDeductCLs = async () => {
        if (summaryData.length === 0) {
            throw new Error("No summary data to process.");
        }
        
        const updates: { [key: string]: number } = {};
        let deductionsMade = 0;

        summaryData.forEach(summaryItem => {
            if (summaryItem.casualLeavesUsed > 0) {
                const newBalance = summaryItem.casualLeavesAvailable - summaryItem.casualLeavesUsed;
                updates[`/faculty/${summaryItem.empId}/casualLeaves`] = newBalance;
                deductionsMade++;
            }
        });

        if (deductionsMade === 0) {
            return "No CL deductions were needed for this month.";
        }

        await db.ref().update(updates);

        // Refresh local faculty list to reflect new balances
        const updatedFacultyList = facultyList.map(f => {
            const summary = summaryData.find(s => s.empId === f.empId);
            if (summary && summary.casualLeavesUsed > 0) {
                return { ...f, casualLeaves: f.casualLeaves - summary.casualLeavesUsed };
            }
            return f;
        });
        setFacultyList(updatedFacultyList);
        
        return `Successfully finalized month. CL deductions applied to ${deductionsMade} faculty members.`;
    };
    
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
        finalizeAndDeductCLs,
        isAllocationRun,
        isCheckingAllocation,
    };
};
