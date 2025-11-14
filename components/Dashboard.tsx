
import React from 'react';
import { useAttendanceData } from '../hooks/useAttendanceData';
import StatCards from './StatCards';
import AttendancePieChart from './AttendancePieChart';
import DepartmentBarChart from './DepartmentBarChart';
import AttendanceTable from './AttendanceTable';
import Filters from './Filters';
import FacultySummaryTable from './FacultySummaryTable';
import FirebaseWarning from './FirebaseWarning';
import { Database } from 'lucide-react';

type DashboardProps = ReturnType<typeof useAttendanceData> & { 
  theme: 'light' | 'dark';
  onFacultySelect: (empId: number) => void;
};

const Dashboard: React.FC<DashboardProps> = ({
  allData,
  filteredData,
  error,
  loading,
  filters,
  setters,
  departments,
  stats,
  pieChartData,
  departmentChartData,
  facultySummaryData,
  clearError,
  theme,
  onFacultySelect
}) => {
  const hasData = allData.length > 0;

  return (
    <div className="space-y-8 relative">
      {loading && (
        <div className="absolute inset-0 bg-primary/80 dark:bg-gray-900/80 flex items-center justify-center z-50 rounded-lg">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-highlight dark:border-teal-300"></div>
            <p className="text-text-secondary dark:text-gray-400 text-lg">Loading Data...</p>
          </div>
        </div>
      )}

      <FirebaseWarning />

      {error && (
        <div className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center dark:bg-red-900/50 dark:border-red-700 dark:text-red-300" role="alert">
          <strong className="font-bold mr-2">Error:</strong>
          <span className="block sm:inline">{error}</span>
          <button onClick={clearError} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <span className="text-2xl">&times;</span>
          </button>
        </div>
      )}

      {!hasData && !loading && !error && (
        <div className="text-center py-20 px-6 bg-secondary rounded-lg shadow-xl dark:bg-gray-800">
          <Database className="mx-auto h-16 w-16 text-highlight dark:text-teal-300" />
          <h2 className="mt-6 text-2xl font-semibold text-text-primary dark:text-gray-200">Database is Empty</h2>
          <p className="mt-2 text-text-secondary dark:text-gray-400">
            Navigate to the 'Upload Data' page to populate the database.
          </p>
        </div>
      )}
      
      {hasData && (
        <>
          <div className="p-6 bg-secondary rounded-lg shadow-xl dark:bg-gray-800">
            <Filters
                filters={filters}
                setters={setters}
                departments={departments}
            />
          </div>
          <StatCards stats={stats} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column for charts */}
            <div className="space-y-8">
              <div className="bg-secondary p-6 rounded-lg shadow-xl h-96 dark:bg-gray-800">
                  <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Attendance Status</h3>
                  <AttendancePieChart data={pieChartData} theme={theme} />
              </div>
              <div className="bg-secondary p-6 rounded-lg shadow-xl h-96 dark:bg-gray-800">
                  <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Department Performance</h3>
                  <DepartmentBarChart data={departmentChartData} theme={theme}/>
              </div>
            </div>

            {/* Right Column for detailed table */}
            <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
              <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Detailed Attendance Records</h3>
              <AttendanceTable data={filteredData} onFacultySelect={onFacultySelect} />
            </div>
          </div>
          <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
            <h3 className="text-xl font-semibold mb-4 text-highlight dark:text-teal-300">Faculty Attendance Summary</h3>
            <FacultySummaryTable data={facultySummaryData} onFacultySelect={onFacultySelect} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
