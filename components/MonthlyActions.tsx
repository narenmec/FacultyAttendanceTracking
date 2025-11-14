import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { FacultyRecord, AttendanceStatus } from '../types';
import { Calendar, Gift, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

const getPreviousMonth = (): string => {
    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    return today.toISOString().slice(0, 7);
};

const MonthlyActions: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState(getPreviousMonth());
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);
    const [isAllocationComplete, setIsAllocationComplete] = useState(false);

    // Check allocation status whenever the selected month changes
    useEffect(() => {
        const checkAllocationStatus = async () => {
            if (!selectedMonth) return;
            setIsCheckingStatus(true);
            setIsAllocationComplete(false);
            setFeedback(null);
            try {
                const allocationRef = db.ref(`monthlyAllocations/${selectedMonth}`);
                const snapshot = await allocationRef.get();
                if (snapshot.exists() && snapshot.val().completed) {
                    setIsAllocationComplete(true);
                }
            } catch (err) {
                console.error("Error checking allocation status:", err);
                setFeedback({ type: 'error', message: 'Could not verify allocation status for this month.' });
            } finally {
                setIsCheckingStatus(false);
            }
        };

        checkAllocationStatus();
    }, [selectedMonth]);

    const handleAllocateCL = async () => {
        if (isAllocationComplete) {
            setFeedback({ type: 'error', message: "This action has already been completed for the selected month." });
            return;
        }
        setIsLoading(true);
        setFeedback(null);
        try {
            // 1. Fetch all faculty
            const facultyRef = db.ref('faculty');
            const facultySnapshot = await facultyRef.get();
            if (!facultySnapshot.exists()) {
                throw new Error("No faculty data found.");
            }
            const facultyList: FacultyRecord[] = [];
            facultySnapshot.forEach(childSnapshot => {
                facultyList.push({ empId: parseInt(childSnapshot.key!, 10), ...childSnapshot.val() });
            });

            // 2. Fetch all attendance for the selected month
            const attendanceRef = db.ref('attendance');
            const attendanceSnapshot = await attendanceRef.get();
            const attendanceData = attendanceSnapshot.exists() ? attendanceSnapshot.val() : {};

            const facultyWithAbsences = new Set<number>();

            for (const empId in attendanceData) {
                const records = attendanceData[empId].records;
                if (records) {
                    for (const date in records) {
                        if (date.startsWith(selectedMonth) && records[date].status === AttendanceStatus.Absent) {
                            facultyWithAbsences.add(parseInt(empId, 10));
                            break; 
                        }
                    }
                }
            }

            // 3. Determine who gets a CL and prepare updates
            const updates: { [key: string]: number } = {};
            let updatedCount = 0;
            facultyList.forEach(faculty => {
                if (!facultyWithAbsences.has(faculty.empId)) {
                    const newCLBalance = (faculty.casualLeaves || 0) + 1;
                    updates[`/faculty/${faculty.empId}/casualLeaves`] = newCLBalance;
                    updatedCount++;
                }
            });

            // 4. Perform batch update if needed
            if (updatedCount > 0) {
                 await db.ref().update(updates);
            }
           
            // 5. Record that the allocation is complete for this month
            await db.ref(`monthlyAllocations/${selectedMonth}`).set({
                completed: true,
                timestamp: new Date().toISOString(),
                updatedCount,
            });
            setIsAllocationComplete(true); // Update UI state immediately

            if (updatedCount === 0) {
                setFeedback({ type: 'success', message: `Process complete. No faculty members were eligible for a CL. This action is now locked for ${selectedMonth}.` });
            } else {
                setFeedback({ type: 'success', message: `Successfully allocated 1 CL to ${updatedCount} faculty members. This action is now locked for ${selectedMonth}.` });
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred.";
            setFeedback({ type: 'error', message: `Allocation failed: ${errorMessage}` });
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="bg-secondary p-8 rounded-lg shadow-xl dark:bg-gray-800">
            <div className="text-center mb-8">
                <Gift className="mx-auto h-12 w-12 text-highlight dark:text-teal-300" />
                <h2 className="mt-4 text-2xl font-semibold text-text-primary dark:text-gray-100">Monthly Actions</h2>
                <p className="mt-2 text-text-secondary dark:text-gray-400">
                    Run periodic administrative tasks for the application.
                </p>
            </div>
            
            {feedback && (
                <div className={`mb-6 p-4 rounded-md text-sm flex items-start gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300'}`}>
                    {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5"/> : <AlertTriangle className="h-5 w-5 mt-0.5"/>}
                    {feedback.message}
                </div>
            )}

            <div className="space-y-4 p-4 border border-accent dark:border-gray-700 rounded-lg">
                <div>
                    <h3 className="font-semibold text-text-primary dark:text-gray-200">Allocate Monthly Casual Leave</h3>
                    <p className="text-sm text-text-secondary dark:text-gray-400">
                        This will grant 1 CL to every faculty member who had no 'Absent' records for the selected month.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                     <div className="relative flex-grow w-full sm:w-auto">
                        <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400" />
                        <input
                            id="month-select-cl"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                    <button
                        onClick={handleAllocateCL}
                        disabled={isLoading || isCheckingStatus || isAllocationComplete}
                        className="w-full sm:w-auto flex justify-center items-center gap-2 bg-highlight text-primary font-bold py-2 px-4 rounded-md hover:bg-teal-300 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 dark:bg-teal-500 dark:hover:bg-teal-400"
                    >
                         {isLoading || isCheckingStatus ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin"/> {isCheckingStatus ? 'Checking Status...' : 'Processing...'}
                            </>
                        ) : (
                           'Run Allocation'
                        )}
                    </button>
                </div>
                 {isAllocationComplete && !isCheckingStatus && !feedback && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Allocation for this month has already been completed.
                    </p>
                )}
            </div>
        </div>
    );
};

export default MonthlyActions;