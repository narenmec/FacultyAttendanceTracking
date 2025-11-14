import React from 'react';
import { Users, Clock, AlertTriangle, UserX, ClipboardCheck } from 'lucide-react';

interface StatCardsProps {
  stats: {
    total: number;
    onTime: number;
    late: number;
    absent: number;
    onDuty: number;
  };
}

const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => {
    return (
        <div className="bg-secondary p-6 rounded-lg shadow-xl flex items-center space-x-4 dark:bg-gray-800">
            <div className={`p-3 rounded-full ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-text-secondary font-medium dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-text-primary dark:text-gray-100">{value}</p>
            </div>
        </div>
    );
};


const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <StatCard title="Total Faculty (Filtered)" value={stats.total} icon={<Users className="h-6 w-6 text-primary dark:text-gray-100"/>} color="bg-indigo-500"/>
        <StatCard title="On-time Records" value={stats.onTime} icon={<Clock className="h-6 w-6 text-primary dark:text-gray-100"/>} color="bg-green-400"/>
        <StatCard title="Late Records" value={stats.late} icon={<AlertTriangle className="h-6 w-6 text-primary dark:text-gray-100"/>} color="bg-red-400"/>
        <StatCard title="Absent Records" value={stats.absent} icon={<UserX className="h-6 w-6 text-primary dark:text-gray-100"/>} color="bg-yellow-500"/>
        <StatCard title="On-Duty Records" value={stats.onDuty} icon={<ClipboardCheck className="h-6 w-6 text-primary dark:text-gray-100"/>} color="bg-sky-500"/>
    </div>
  );
};

export default StatCards;
