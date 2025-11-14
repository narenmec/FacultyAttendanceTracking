
import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase/config.ts';
import { Holiday } from '../types.ts';

export const useHolidays = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHolidays = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const holidaysRef = db.ref('holidays');
        const snapshot = await holidaysRef.get();
        if (snapshot.exists()) {
            const dataFromDb = snapshot.val();
            const loadedHolidays: Holiday[] = Object.entries(dataFromDb).map(([id, details]) => ({
                id,
                ...(details as Omit<Holiday, 'id'>),
            }));
            setHolidays(loadedHolidays.sort((a, b) => a.date.localeCompare(b.date)));
        } else {
            setHolidays([]);
        }
    } catch (err) {
        console.error("Error fetching holiday data from Firebase: ", err);
        setError("Failed to load holiday data.");
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const addHoliday = useCallback(async (newHoliday: Omit<Holiday, 'id'>) => {
    setError(null);
    const holidayId = newHoliday.date; // Use date as the ID
    if (holidays.some(h => h.id === holidayId)) {
        const err = `A holiday for the date ${holidayId} already exists.`;
        setError(err);
        throw new Error(err);
    }
    
    try {
      const holidayRef = db.ref(`holidays/${holidayId}`);
      await holidayRef.set(newHoliday);
      setHolidays(prev => [...prev, { id: holidayId, ...newHoliday }].sort((a, b) => a.date.localeCompare(b.date)));
    } catch(err) {
      console.error(err);
      setError("Failed to add holiday.");
      throw err;
    }
  }, [holidays]);
  
  const updateHoliday = useCallback(async (holidayId: string, dataToUpdate: Omit<Holiday, 'id' | 'date'>) => {
    setError(null);
    try {
        const holidayRef = db.ref(`holidays/${holidayId}`);
        await holidayRef.update(dataToUpdate);
        setHolidays(prev => 
            prev.map(holiday => 
                holiday.id === holidayId ? { ...holiday, ...dataToUpdate } : holiday
            ).sort((a,b) => a.date.localeCompare(b.date))
        );
    } catch(err) {
        console.error(err);
        setError("Failed to update holiday.");
        throw err;
    }
  }, []);

  const deleteHoliday = useCallback(async (holidayId: string) => {
    setError(null);
    try {
      const holidayRef = db.ref(`holidays/${holidayId}`);
      await holidayRef.remove();
      setHolidays(prev => prev.filter(h => h.id !== holidayId));
    } catch(err) {
        console.error("Failed to delete holiday:", err);
        setError("Failed to delete holiday.");
        throw err;
    }
  }, []);


  return {
    holidays,
    error,
    loading,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    clearError: () => setError(null)
  };
};