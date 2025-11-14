
import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db } from '../firebase/config.ts';
import { FacultyRecord } from '../types.ts';

const processRawFacultyData = (jsonData: any[]): FacultyRecord[] => {
  return jsonData.map((row, index) => {
    const normalizedRow: { [key: string]: any } = {};
    for (const key in row) {
        normalizedRow[key.toLowerCase().replace(/\s/g, '')] = row[key];
    }

    return {
      empId: parseInt(normalizedRow['empid'] || normalizedRow['emp.id'], 10) || index,
      name: normalizedRow['name'] || 'N/A',
      dept: normalizedRow['dept'] || 'N/A',
      designation: normalizedRow['designation'] || 'N/A',
      salary: parseFloat(normalizedRow['salary']) || 0,
      casualLeaves: parseInt(normalizedRow['casualleaves'], 10) || 0,
    };
  });
};


export const useFacultyData = () => {
  const [facultyList, setFacultyList] = useState<FacultyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const facultyRef = db.ref('faculty');
        const snapshot = await facultyRef.get();
        if (snapshot.exists()) {
            const dataFromDb = snapshot.val();
            const loadedFaculty: FacultyRecord[] = Object.entries(dataFromDb).map(([empId, details]) => ({
                empId: parseInt(empId, 10),
                ...(details as Omit<FacultyRecord, 'empId'>),
            }));
            setFacultyList(loadedFaculty.sort((a, b) => a.name.localeCompare(b.name)));
        } else {
            setFacultyList([]);
        }
    } catch (err) {
        console.error("Error fetching faculty data from Firebase: ", err);
        setError("Failed to load faculty data.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addFaculty = useCallback(async (newFaculty: FacultyRecord) => {
    if (facultyList.some(f => f.empId === newFaculty.empId)) {
        setError(`Faculty with Employee ID ${newFaculty.empId} already exists.`);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const facultyRef = db.ref(`faculty/${newFaculty.empId}`);
      await facultyRef.set({
        name: newFaculty.name,
        dept: newFaculty.dept,
        designation: newFaculty.designation,
        salary: newFaculty.salary,
        casualLeaves: newFaculty.casualLeaves || 0
      });
      setFacultyList(prev => [...prev, newFaculty].sort((a, b) => a.name.localeCompare(b.name)));
    } catch(err) {
      console.error(err);
      setError("Failed to add faculty member.");
    } finally {
      setLoading(false);
    }
  }, [facultyList]);
  
  const updateFaculty = useCallback(async (empId: number, dataToUpdate: Omit<FacultyRecord, 'empId'>) => {
    setLoading(true);
    setError(null);
    try {
        const facultyRef = db.ref(`faculty/${empId}`);
        await facultyRef.set(dataToUpdate);
        setFacultyList(prev => 
            prev.map(faculty => 
                faculty.empId === empId ? { empId, ...dataToUpdate } : faculty
            ).sort((a,b) => a.name.localeCompare(b.name))
        );
    } catch(err) {
        console.error(err);
        setError("Failed to update faculty member.");
        throw err; // Re-throw to be caught in the component
    } finally {
        setLoading(false);
    }
  }, []);

  const deleteFaculty = useCallback(async (empId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Deleting a faculty member also removes their associated attendance records
      // to maintain data integrity. This is a hard delete.
      const updates: { [key: string]: null } = {};
      updates[`/faculty/${empId}`] = null;
      updates[`/attendance/${empId}`] = null;

      await db.ref().update(updates);

      setFacultyList(prev => prev.filter(f => f.empId !== empId));
    } catch(err) {
        console.error("Failed to delete faculty member:", err);
        setError("Failed to delete faculty member.");
        throw err; // Re-throw to be caught in the component
    } finally {
        setLoading(false);
    }
  }, []);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        setError(null);
        const data = e.target?.result;
        if (!data) throw new Error("File is empty");
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) throw new Error("Excel sheet is empty.");
        
        const processedData = processRawFacultyData(jsonData);
        
        const updates: { [key: string]: any } = {};
        processedData.forEach((faculty) => {
            const path = `/faculty/${faculty.empId}`;
            const { empId, ...facultyData } = faculty;
            updates[path] = facultyData;
        });

        await db.ref().update(updates);
        
        await fetchData();

      } catch (err) {
        console.error(err);
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(`File processing failed: ${errorMessage}`);
      } finally {
          setLoading(false);
      }
    };
    reader.onerror = () => {
        setError("Failed to read the file.");
        setLoading(false);
    };
    reader.readAsBinaryString(file);
  }, [fetchData]);

  return {
    facultyList,
    error,
    loading,
    addFaculty,
    updateFaculty,
    deleteFaculty,
    handleFileUpload,
    clearError: () => setError(null)
  };
};
