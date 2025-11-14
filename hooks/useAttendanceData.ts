
import { useState, useMemo, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../firebase/config.ts';
import { AttendanceRecord, AttendanceStatus, FacultySummaryRecord } from '../types.ts';
import { useSettings } from '../components/SettingsContext.tsx';

const processRawData = (jsonData: any[], date: string, onTimeThreshold: string): AttendanceRecord[] => {
  return jsonData.map((row, index) => {
    // Normalize column names (case-insensitive and space-insensitive)
    const normalizedRow: { [key: string]: any } = {};
    for (const key in row) {
        normalizedRow[key.toLowerCase().replace(/\s/g, '')] = row[key];
    }

    const empId = normalizedRow['emp.id'] || normalizedRow['empid'] || index;
    const inTimeRaw = normalizedRow['in.time'] || normalizedRow['intime'];
    let inTime: string;

    if (typeof inTimeRaw === 'number') {
        // Excel stores time as a fraction of a day.
        inTime = XLSX.SSF.format('HH:mm:ss', inTimeRaw);
    } else if (typeof inTimeRaw === 'string') {
        // If it's HH:MM, append seconds for consistent comparison
        if (/^\d{1,2}:\d{2}$/.test(inTimeRaw)) {
            inTime = `${inTimeRaw}:00`;
        } else {
            inTime = inTimeRaw;
        }
    } else {
        inTime = '00:00:00';
    }
    
    let status: AttendanceStatus;
    if (inTime === '00:00:00' || !inTime) {
      status = AttendanceStatus.Absent;
    } else if (inTime <= onTimeThreshold) {
      status = AttendanceStatus.OnTime;
    } else {
      status = AttendanceStatus.Late;
    }

    return {
      id: `${date}-${empId}`,
      empId: empId,
      name: normalizedRow['name'] || 'N/A',
      dept: normalizedRow['dept'] || 'N/A',
      inTime: status === AttendanceStatus.Absent ? '00:00:00' : inTime,
      status: status,
      date: date,
    };
  });
};

export const useAttendanceData = () => {
  const { settings } = useSettings();
  const [allData, setAllData] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'error' | 'success' | 'warning', message: string } | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [startDateFilter, setStartDateFilter] = useState<string>(today);
  const [endDateFilter, setEndDateFilter] = useState<string>(today);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [facultyNameFilter, setFacultyNameFilter] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch faculty data to create a lookup map
            const facultyRef = db.ref('faculty');
            const facultySnapshot = await facultyRef.get();
            const facultyMap = new Map<string, { name: string; dept: string }>();
            if (facultySnapshot.exists()) {
                const facultyData = facultySnapshot.val();
                for (const empId in facultyData) {
                    facultyMap.set(empId, { name: facultyData[empId].name, dept: facultyData[empId].dept });
                }
            }
            
            // 2. Fetch attendance data
            const attendanceRef = db.ref('attendance');
            const snapshot = await attendanceRef.get();
            if (snapshot.exists()) {
                const dataFromDb = snapshot.val();
                const flattenedData: AttendanceRecord[] = [];
                // Loop through each employee ID in attendance records
                for (const empId in dataFromDb) {
                    const facultyDetails = facultyMap.get(empId) || { name: `Unknown (${empId})`, dept: 'Unknown' };
                    const { records } = dataFromDb[empId];
                    if (records) {
                        // Loop through each attendance record for the employee
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
                setAllData(flattenedData);
            } else {
                setAllData([]);
            }
        } catch (err) {
            console.error("Error fetching data from Firebase: ", err);
            if (err instanceof Error && err.message.includes('permission-denied')) {
                 setError("Database error: Missing or insufficient permissions. Check your Realtime Database security rules.");
            } else {
                 setError("Failed to load data. Check your Firebase config and internet connection.");
            }
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const handleFileUpload = useCallback((file: File, date: string) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setUploadStatus(null);
      setLoading(true);
      try {
        const data = e.target?.result;
        if (!data) throw new Error("File is empty or unreadable");
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: 1 });
        
        if (jsonData.length === 0) {
            throw new Error("Excel sheet is empty or has no data.");
        }
        
        const processedData = processRawData(jsonData, date, settings.onTimeThreshold);

        const facultyRef = db.ref('faculty');
        const facultySnapshot = await facultyRef.get();
        if (!facultySnapshot.exists()) {
            throw new Error('No faculty data found in the database. Please add faculty members before uploading attendance.');
        }
        const validEmpIds = new Set(Object.keys(facultySnapshot.val()));

        const validRecords: AttendanceRecord[] = [];
        const invalidEmpIds = new Set<number>();

        processedData.forEach(record => {
            if (validEmpIds.has(String(record.empId))) {
                validRecords.push(record);
            } else {
                invalidEmpIds.add(record.empId);
            }
        });
        
        if (validRecords.length === 0) {
            const invalidIdsString = [...invalidEmpIds].join(', ');
            throw new Error(`Upload failed: None of the employee IDs in the file match the faculty database. Invalid IDs found: ${invalidIdsString}`);
        }
        
        const updates: { [key: string]: any } = {};
        validRecords.forEach((record) => {
            const recordPath = `/attendance/${record.empId}/records/${record.date}`;
            updates[recordPath] = {
                inTime: record.inTime,
                status: record.status,
            };
        });

        await db.ref('/').update(updates);
        
        if (invalidEmpIds.size > 0) {
            const invalidIdsString = [...invalidEmpIds].join(', ');
            setUploadStatus({
                type: 'warning',
                message: `Successfully uploaded ${validRecords.length} records. ${invalidEmpIds.size} records were skipped due to unmatched Employee IDs: ${invalidIdsString}.`
            });
        } else {
            setUploadStatus({
                type: 'success',
                message: `Successfully uploaded ${validRecords.length} records.`
            });
        }
        
        const facultyMap = new Map<string, { name: string; dept: string }>();
        const facultyData = facultySnapshot.val();
        for (const empId in facultyData) {
            facultyMap.set(empId, { name: facultyData[empId].name, dept: facultyData[empId].dept });
        }

        setAllData(prevData => {
            const dataMap = new Map(prevData.map(d => [d.id, d]));
            validRecords.forEach(p => {
                const facultyDetails = facultyMap.get(String(p.empId)) || { name: `Unknown (${p.empId})`, dept: 'Unknown' };
                dataMap.set(p.id, { ...p, name: facultyDetails.name, dept: facultyDetails.dept });
            });
            return Array.from(dataMap.values());
        });

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        if (errorMessage.includes('permission-denied')) {
            setUploadStatus({ type: 'error', message: "Upload failed: Missing or insufficient permissions. Check your Realtime Database security rules." });
        } else {
            setUploadStatus({ type: 'error', message: `File processing failed: ${errorMessage}` });
        }
      } finally {
          setLoading(false);
      }
    };
    reader.onerror = () => {
        setUploadStatus({ type: 'error', message: "Failed to read the file." });
        setLoading(false);
    };
    reader.readAsBinaryString(file);
  }, [settings.onTimeThreshold]);

  const departments = useMemo(() => {
    const depts = new Set(allData.map(d => d.dept));
    return ['all', ...Array.from(depts)];
  }, [allData]);

  const filteredData = useMemo(() => {
    return allData.filter(record => {
      const dateMatch =
        (!startDateFilter || record.date >= startDateFilter) &&
        (!endDateFilter || record.date <= endDateFilter);
      const deptMatch = departmentFilter === 'all' || record.dept === departmentFilter;
      const nameMatch = !facultyNameFilter || record.name.toLowerCase().includes(facultyNameFilter.toLowerCase());
      return dateMatch && deptMatch && nameMatch;
    });
  }, [allData, startDateFilter, endDateFilter, departmentFilter, facultyNameFilter]);
  
  const stats = useMemo(() => {
    const totalRecords = filteredData.length;
    // Calculate unique faculty members based on filtered data
    const uniqueFaculty = new Set(filteredData.map(d => d.empId)).size;
    const onTime = filteredData.filter(d => d.status === AttendanceStatus.OnTime).length;
    const late = filteredData.filter(d => d.status === AttendanceStatus.Late).length;
    const absent = filteredData.filter(d => d.status === AttendanceStatus.Absent).length;
    const onDuty = filteredData.filter(d => d.status === AttendanceStatus.OnDuty).length;
    // The "Total Faculty" card should show the number of unique faculty in the current filtered view,
    // not the total number of records.
    return { total: uniqueFaculty, onTime, late, absent, onDuty };
  }, [filteredData]);
  
  const pieChartData = useMemo(() => [
      { name: AttendanceStatus.OnTime, value: stats.onTime },
      { name: AttendanceStatus.Late, value: stats.late },
      { name: AttendanceStatus.Absent, value: stats.absent },
      { name: AttendanceStatus.OnDuty, value: stats.onDuty },
  ], [stats]);

  const departmentChartData = useMemo(() => {
    const dataByDept: { [key: string]: { [key in AttendanceStatus]: number } } = {};
    
    filteredData.forEach(record => {
      if (!dataByDept[record.dept]) {
        dataByDept[record.dept] = { 
            [AttendanceStatus.OnTime]: 0, 
            [AttendanceStatus.Late]: 0, 
            [AttendanceStatus.Absent]: 0, 
            [AttendanceStatus.OnDuty]: 0 
        };
      }
      if(record.status in dataByDept[record.dept]) {
        dataByDept[record.dept][record.status]++;
      }
    });

    return Object.entries(dataByDept).map(([name, values]) => ({
      name,
      ...values,
    }));
  }, [filteredData]);

  const facultySummaryData = useMemo(() => {
    const summary: { [key: number]: { empId: number; name: string; onTime: number; late: number; absent: number; } } = {};

    filteredData.forEach(record => {
      if (!summary[record.empId]) {
        summary[record.empId] = {
          empId: record.empId,
          name: record.name,
          onTime: 0,
          late: 0,
          absent: 0,
        };
      }

      switch (record.status) {
        case AttendanceStatus.OnTime:
          summary[record.empId].onTime++;
          break;
        case AttendanceStatus.Late:
          summary[record.empId].late++;
          break;
        case AttendanceStatus.Absent:
          summary[record.empId].absent++;
          break;
      }
    });

    return Object.values(summary).map(s => ({
        ...s,
        totalDays: s.onTime + s.late + s.absent,
    }));
  }, [filteredData]);

  return {
    allData,
    filteredData,
    error,
    loading,
    uploadStatus,
    clearUploadStatus: () => setUploadStatus(null),
    handleFileUpload,
    filters: {
      startDate: startDateFilter,
      endDate: endDateFilter,
      department: departmentFilter,
      facultyName: facultyNameFilter,
    },
    setters: {
      setStartDateFilter,
      setEndDateFilter,
      setDepartmentFilter,
      setFacultyNameFilter,
    },
    departments,
    stats,
    pieChartData,
    departmentChartData,
    facultySummaryData,
    clearError: () => setError(null)
  };
};