
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/config';
import { AttendanceRecord, FacultyRecord, AttendanceStatus, LeaveApplicationRecord } from '../types';

export const useFacultyDetailData = (empId: number) => {
    const [faculty, setFaculty] = useState<FacultyRecord | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [leaveApplications, setLeaveApplications] = useState<LeaveApplicationRecord[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

    const fetchData = useCallback(async () => {
        if (!empId) return;
        setLoading(true);
        setError(null);
        try {
            const facultyRef = db.ref(`faculty/${empId}`);
            const attendanceRef = db.ref(`attendance/${empId}/records`);
            const leaveAppRef = db.ref('leaveApplications');
            
            const [facultySnapshot, attendanceSnapshot, leaveSnapshot] = await Promise.all([
                facultyRef.get(),
                attendanceRef.get(),
                leaveAppRef.get()
            ]);

            if (facultySnapshot.exists()) {
                setFaculty({ empId, ...facultySnapshot.val() });
            } else {
                throw new Error("Faculty member not found.");
            }

            if (attendanceSnapshot.exists()) {
                const records = attendanceSnapshot.val();
                const loadedAttendance: AttendanceRecord[] = Object.entries(records).map(([date, record]: [string, any]) => ({
                    id: `${date}-${empId}`,
                    empId,
                    name: facultySnapshot.val().name,
                    dept: facultySnapshot.val().dept,
                    date,
                    inTime: record.inTime,
                    status: record.status,
                    leaveApplicationId: record.leaveApplicationId,
                }));
                setAttendance(loadedAttendance.sort((a,b) => b.date.localeCompare(a.date)));
            } else {
                setAttendance([]);
            }
            
            if (leaveSnapshot.exists()) {
                const leavesData = leaveSnapshot.val();
                // FIX: Cast the result of `Object.values` to `LeaveApplicationRecord[]` before filtering.
                // TypeScript infers `Object.values(leavesData)` as `unknown[]`, which is not directly assignable or filterable as a typed array.
                const loadedLeaves: LeaveApplicationRecord[] = (Object.values(leavesData) as LeaveApplicationRecord[]).filter(
                    (leave) => leave.empId === empId
                );
                // Sort by start date descending
                setLeaveApplications(loadedLeaves.sort((a,b) => b.startDate.localeCompare(a.startDate)));
            } else {
                setLeaveApplications([]);
            }

        } catch (err) {
            console.error("Error fetching faculty detail data:", err);
            setError("Failed to load data for this faculty member.");
        } finally {
            setLoading(false);
        }
    }, [empId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredAttendance = useMemo(() => {
        return attendance.filter(record => record.date.startsWith(selectedMonth));
    }, [attendance, selectedMonth]);

    const filteredLeaveApplications = useMemo(() => {
        return leaveApplications.filter(app => app.startDate.startsWith(selectedMonth) || app.endDate.startsWith(selectedMonth));
    }, [leaveApplications, selectedMonth]);

    const monthStats = useMemo(() => {
        const onTime = filteredAttendance.filter(r => r.status === AttendanceStatus.OnTime).length;
        const late = filteredAttendance.filter(r => r.status === AttendanceStatus.Late).length;
        const absent = filteredAttendance.filter(r => r.status === AttendanceStatus.Absent).length;
        const onDuty = filteredAttendance.filter(r => r.status === AttendanceStatus.OnDuty).length;
        const present = onTime + late + onDuty;
        const clUsedThisMonth = Math.min(absent, faculty?.casualLeaves ?? 0);
        const unpaidLeave = absent - clUsedThisMonth;
        const appliedLeave = filteredAttendance.filter(r => !!r.leaveApplicationId).length;
        return { onTime, late, absent, onDuty, present, clUsedThisMonth, unpaidLeave, appliedLeave };
    }, [filteredAttendance, faculty]);


    const deleteLeave = useCallback(async (leave: LeaveApplicationRecord) => {
        if (!empId) return;
        setError(null);

        const updates: { [key: string]: null } = {};
        updates[`/leaveApplications/${leave.id}`] = null;
        
        const startParts = leave.startDate.split('-').map(Number);
        const endParts = leave.endDate.split('-').map(Number);

        const current = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
        const last = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2]));

        while (current <= last) {
            const dateString = current.toISOString().split('T')[0];
            const recordPath = `/attendance/${empId}/records/${dateString}`;
            updates[recordPath] = null;
            current.setUTCDate(current.getUTCDate() + 1);
        }

        try {
            await db.ref('/').update(updates);
            await fetchData();
        } catch (err) {
            console.error("Error deleting leave:", err);
            const errorMessage = "Failed to delete leave. Please check permissions and try again.";
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [empId, fetchData]);

    return {
        faculty,
        filteredAttendance,
        monthStats,
        leaveApplications: filteredLeaveApplications,
        loading,
        error,
        selectedMonth,
        setSelectedMonth,
        fetchData,
        deleteLeave,
        clearError: () => setError(null)
    };
};
