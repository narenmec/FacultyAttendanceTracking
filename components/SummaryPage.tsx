
import React from 'react';
import { useSummaryData } from '../hooks/useSummaryData';
import SummaryTable from './SummaryTable';
import { generateSummaryPDF } from '../utils/pdfGenerator';
import { generateSummaryCSV } from '../utils/csvGenerator';
import { FileDown, Calendar, Briefcase, FileSpreadsheet } from 'lucide-react';

interface SummaryPageProps {
  onFacultySelect: (empId: number) => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ onFacultySelect }) => {
    const {
        summaryData,
        loading,
        error,
        clearError,
        selectedMonth,
        setSelectedMonth,
        monthlyWorkingDays,
        setMonthlyWorkingDays,
        recalculate,
        updatePayableDays,
    } = useSummaryData();

    const handlePdfExport = () => {
        if (summaryData.length > 0) {
            generateSummaryPDF(summaryData, selectedMonth, monthlyWorkingDays);
        } else {
            alert("No data available to export.");
        }
    };

    const handleCsvExport = () => {
        if (summaryData.length > 0) {
            generateSummaryCSV(summaryData, selectedMonth);
        } else {
            alert("No data available to export.");
        }
    };
    
    return (
        <div className="space-y-8">
            {loading && (
                <div className="fixed inset-0 bg-primary/80 dark:bg-gray-900/80 flex items-center justify-center z-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-highlight dark:border-teal-300"></div>
                        <p className="text-text-secondary dark:text-gray-400 text-lg">Calculating Summaries...</p>
                    </div>
                </div>
            )}
             {error && (
                <div className="bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center dark:bg-red-900/50 dark:border-red-700 dark:text-red-300" role="alert">
                    <strong className="font-bold mr-2">Error:</strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={clearError} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
            )}
            
            <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-semibold text-highlight dark:text-teal-300">Monthly Attendance & Salary Summary</h2>
                     <div className="flex flex-col sm:flex-row items-center gap-2">
                         <button
                            onClick={handleCsvExport}
                            disabled={summaryData.length === 0}
                            className="w-full sm:w-auto bg-green-600 text-primary font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 dark:bg-green-500 dark:hover:bg-green-600"
                        >
                            <FileSpreadsheet size={18} />
                            Export to Excel
                        </button>
                        <button
                            onClick={handlePdfExport}
                            disabled={summaryData.length === 0}
                            className="w-full sm:w-auto bg-highlight text-primary font-bold py-2 px-4 rounded-md hover:bg-teal-300 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center gap-2 dark:bg-teal-500 dark:hover:bg-teal-400"
                        >
                            <FileDown size={18} />
                            Generate PDF Report
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 border-t border-accent dark:border-gray-700 pt-6">
                    <div className="relative">
                        <label htmlFor="month-select" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Select Month</label>
                        <Calendar size={18} className="absolute left-3 top-10 text-text-secondary dark:text-gray-400" />
                        <input
                            id="month-select"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                     <div className="relative">
                        <label htmlFor="working-days" className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Monthly Working Days</label>
                         <Briefcase size={18} className="absolute left-3 top-10 text-text-secondary dark:text-gray-400" />
                        <input
                            id="working-days"
                            type="number"
                            value={monthlyWorkingDays}
                            onChange={(e) => setMonthlyWorkingDays(parseInt(e.target.value, 10) || 0)}
                             className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-secondary p-6 rounded-lg shadow-xl dark:bg-gray-800">
                <SummaryTable data={summaryData} onPayableDaysChange={updatePayableDays} onFacultySelect={onFacultySelect} />
            </div>

        </div>
    );
};

export default SummaryPage;
