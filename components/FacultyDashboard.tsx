import React from 'react';
import { useFacultyDetailData } from '../hooks/useFacultyDetailData';
import { Loader2, User, Building, Briefcase, Clock, AlertTriangle, UserX, ClipboardCheck, CalendarCheck } from 'lucide-react';
import CalendarView from './CalendarView';
import LeaveManagement from './LeaveManagement';

interface FacultyDashboardProps {
  empId: number;
  theme: 'light' | 'dark';
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-secondary p-4 rounded-lg shadow-lg flex items-center space-x-3 dark:bg-gray-800">
        {icon}
        <div>
            <p className="text-sm text-text-secondary font-medium dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-text-primary dark:text-gray-100">{value}</p>
        </div>
    </div>
);


const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ empId, theme }) => {
    const { faculty, filteredAttendance, monthStats, leaveApplications, loading, error, selectedMonth, setSelectedMonth, fetchData } = useFacultyDetailData(empId);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-highlight" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/50 dark:border-red-700 dark:text-red-300" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }
    
    if (!faculty) {
        return <div>Faculty data could not be loaded.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <div className="flex flex-col md:flex-row items-start gap-6">
                    <div className="flex-shrink-0 bg-highlight p-4 rounded-full">
                        <User size={48} className="text-primary dark:text-gray-100"/>
                    </div>
                    <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-highlight dark:text-teal-300">{faculty.name}</h2>
                        <p className="text-text-secondary dark:text-gray-400">Employee ID: {faculty.empId}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-text-primary dark:text-gray-300">
                            <span className="flex items-center gap-2"><Building size={16} className="text-text-secondary dark:text-gray-500"/>{faculty.dept}</span>
                            <span className="flex items-center gap-2"><Briefcase size={16} className="text-text-secondary dark:text-gray-500"/>{faculty.designation}</span>
                        </div>
                    </div>
                     <div className="relative self-start">
                        <label htmlFor="month-select" className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">View Month</label>
                        <input
                            id="month-select"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-primary border border-accent rounded-md p-2 pl-4 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard title="Present Days" value={monthStats.present} icon={<Clock size={24} className="text-green-500"/>} />
                <StatCard title="Late Days" value={monthStats.late} icon={<AlertTriangle size={24} className="text-red-500"/>} />
                <StatCard title="Absent Days" value={monthStats.absent} icon={<UserX size={24} className="text-yellow-500"/>} />
                <StatCard title="On-Duty" value={monthStats.onDuty} icon={<ClipboardCheck size={24} className="text-blue-500"/>} />
                <StatCard title="Applied Leave" value={monthStats.appliedLeave} icon={<CalendarCheck size={24} className="text-purple-500"/>} />
            </div>

             <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Monthly Attendance Calendar</h3>
                <CalendarView attendanceData={filteredAttendance} month={selectedMonth} theme={theme}/>
            </div>

            <LeaveManagement faculty={faculty} onLeaveApplied={fetchData} leaveApplications={leaveApplications} />
        </div>
    );
};

export default FacultyDashboard;
