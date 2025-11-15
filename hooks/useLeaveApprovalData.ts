import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase/config';
import { LeaveApplicationRecord } from '../types';

export const useLeaveApprovalData = () => {
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplicationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLeaveApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const leaveRef = db.ref('leaveApplications');
      const snapshot = await leaveRef.get();
      if (snapshot.exists()) {
        const dataFromDb = snapshot.val();
        const loadedLeaves: LeaveApplicationRecord[] = Object.values(dataFromDb);
        setLeaveApplications(loadedLeaves.sort((a, b) => b.submissionTimestamp.localeCompare(a.submissionTimestamp)));
      } else {
        setLeaveApplications([]);
      }
    } catch (err) {
      console.error('Error fetching leave applications from Firebase: ', err);
      setError('Failed to load leave application data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaveApplications();
  }, [fetchLeaveApplications]);

  const approveLeave = useCallback(async (leaveId: string) => {
    const originalApplications = [...leaveApplications];
    setLeaveApplications(prev => prev.map(app => 
        app.id === leaveId ? { ...app, status: 'Approved' } : app
    ));
    try {
        await db.ref(`leaveApplications/${leaveId}`).update({ status: 'Approved' });
    } catch (err) {
        setLeaveApplications(originalApplications);
        console.error('Failed to approve leave:', err);
        throw new Error('Failed to approve leave. Please try again.');
    }
  }, [leaveApplications]);
  
  const rejectLeave = useCallback(async (leaveId: string) => {
    const originalApplications = [...leaveApplications];
    setLeaveApplications(prev => prev.map(app => 
        app.id === leaveId ? { ...app, status: 'Rejected' } : app
    ));
    try {
        await db.ref(`leaveApplications/${leaveId}`).update({ status: 'Rejected' });
    } catch (err) {
        setLeaveApplications(originalApplications);
        console.error('Failed to reject leave:', err);
        throw new Error('Failed to reject leave. Please try again.');
    }
  }, [leaveApplications]);


  return {
    leaveApplications,
    error,
    loading,
    approveLeave,
    rejectLeave,
    refresh: fetchLeaveApplications,
    clearError: () => setError(null),
  };
};