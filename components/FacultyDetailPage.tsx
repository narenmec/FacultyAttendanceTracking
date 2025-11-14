

import React from 'react';
import { useFacultyDetailData } from '../hooks/useFacultyDetailData';
import { ArrowLeft, Loader2, User, Briefcase, Building, Clock, AlertTriangle, UserX, ClipboardCheck, Calendar as CalendarIcon, Wallet } from 'lucide-react';
import CalendarView from './CalendarView';
import { AttendanceRecord, AttendanceStatus } from '../types';

interface FacultyDetailPageProps {
  empId: number;
  onBack: () => void;
  theme: 'light' | 'dark';
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; }> = ({ title, value, icon }) => {
    return (
        <div className="bg-secondary p-4 rounded-lg shadow-lg flex items-center space-x-3 dark:bg-gray-800">
            {icon}
            <div>
                <p className="text-sm text-text-secondary font-medium dark:text-gray-400">{title}</p>
                <p className="text-xl font-bold text-text-primary dark:text-gray-100">{value}</p>
            </div>
        </div>
    );
};

const ClBalanceCard: React.FC<{ balance: number; used: number; }> = ({ balance, used }) => {
    return (
        <div className="bg-secondary p-4 rounded-lg shadow-lg flex items-start space-x-3 dark:bg-gray-800">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
                <Wallet size={24} />
            </div>
            <div className="flex-1">
                <p className="text-sm text-text-secondary font-medium dark:text-gray-400">CL Balance</p>
                <p className="text-xl font-bold text-text-primary dark:text-gray-100">{balance}</p>
                <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">{used} used this month</p>
            </div>
        </div>
    );
};

const DetailRecordTable: React.FC<{ data: AttendanceRecord[] }> = ({ data }) => {
    if (data.length === 0) {
        return <div className="text-center py-10 text-text-secondary dark:text-gray-400">No records for this month.</div>
    }

    return (
        <div className="overflow-x-auto max-h-96">
            <table className="min-w-full divide-y divide-accent dark:divide-gray-700">
                <thead className="bg-primary dark:bg-gray-900 sticky top-0">
                    <tr>
                        <th className="p-3 text-left font-semibold text-text-secondary tracking-wider dark:text-gray-400">Date</th>
                        <th className="p-3 text-left font-semibold text-text-secondary tracking-wider dark:text-gray-400">In Time</th>
                        <th className="p-3 text-left font-semibold text-text-secondary tracking-wider dark:text-gray-400">Status</th>
                    </tr>
                </thead>
                <tbody className="bg-secondary divide-y divide-accent dark:bg-gray-800 dark:divide-gray-700">
                {data.map((record) => (
                    <tr key={record.id} className="hover:bg-accent transition-colors duration-150 dark:hover:bg-gray-700">
                        <td className="p-3 text-sm text-text-primary dark:text-gray-300">{record.date}</td>
                        <td className="p-3 text-sm text-text-primary dark:text-gray-300">{record.status === AttendanceStatus.Absent ? 'No Punch' : record.status === AttendanceStatus.OnDuty ? 'N/A' : record.inTime}</td>
                        <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.status === AttendanceStatus.OnTime ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300'
                            : record.status === AttendanceStatus.Late ? 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300'
                            : record.status === AttendanceStatus.OnDuty ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300'
                            }`}>
                            {record.status}
                            </span>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
};


const FacultyDetailPage: React.FC<FacultyDetailPageProps> = ({ empId, onBack, theme }) => {
  const { faculty, filteredAttendance, monthStats, loading, error, selectedMonth, setSelectedMonth } = useFacultyDetailData(empId);

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
    return <div>Faculty not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-text-secondary hover:bg-accent hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200">
          <ArrowLeft size={16} />
          Back
        </button>
      </div>
      
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
                <CalendarIcon size={16} className="absolute left-3 top-8 text-text-secondary dark:text-gray-400" />
                <input
                    id="month-select"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
            </div>
        </div>
      </div>

       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard title="Present Days" value={monthStats.present} icon={<Clock size={24} className="text-green-500"/>} />
            <StatCard title="Late Days" value={monthStats.late} icon={<AlertTriangle size={24} className="text-red-500"/>} />
            <StatCard title="Absent Days" value={monthStats.absent} icon={<UserX size={24} className="text-yellow-500"/>} />
            <StatCard title="On-Duty" value={monthStats.onDuty} icon={<ClipboardCheck size={24} className="text-blue-500"/>} />
            <ClBalanceCard balance={faculty.casualLeaves} used={monthStats.clUsedThisMonth} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Monthly Attendance Calendar</h3>
                <CalendarView attendanceData={filteredAttendance} month={selectedMonth} theme={theme}/>
            </div>
             <div className="lg:col-span-2 bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Detailed Record Log</h3>
                <DetailRecordTable data={filteredAttendance} />
            </div>
        </div>
    </div>
  );
};

export default FacultyDetailPage;