
import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/config';
import { AttendanceRecord, FacultyRecord, AttendanceStatus } from '../types';

export const useFacultyDetailData = (empId: number) => {
    const [faculty, setFaculty] = useState<FacultyRecord | null>(null);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
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
            
            const [facultySnapshot, attendanceSnapshot] = await Promise.all([
                facultyRef.get(),
                attendanceRef.get()
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
                }));
                setAttendance(loadedAttendance.sort((a,b) => b.date.localeCompare(a.date)));
            } else {
                setAttendance([]);
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

    const monthStats = useMemo(() => {
        const onTime = filteredAttendance.filter(r => r.status === AttendanceStatus.OnTime).length;
        const late = filteredAttendance.filter(r => r.status === AttendanceStatus.Late).length;
        const absent = filteredAttendance.filter(r => r.status === AttendanceStatus.Absent).length;
        const onDuty = filteredAttendance.filter(r => r.status === AttendanceStatus.OnDuty).length;
        const present = onTime + late + onDuty;
        return { onTime, late, absent, onDuty, present };
    }, [filteredAttendance]);

    return {
        faculty,
        filteredAttendance,
        monthStats,
        loading,
        error,
        selectedMonth,
        setSelectedMonth,
        clearError: () => setError(null)
    };
};
