
import React, { useState } from 'react';
import { useFacultyData } from '../hooks/useFacultyData';
import FacultyTable from './FacultyTable';
import FacultyFileUpload from './FacultyFileUpload';
import EditFacultyForm from './EditFacultyForm';
import ManualAttendance from './ManualAttendance';
import { UserPlus, UploadCloud, Edit, List, ClipboardCheck } from 'lucide-react';

interface FacultyPageProps {
  theme: 'light' | 'dark';
  onFacultySelect: (empId: number) => void;
}

const FacultyPage: React.FC<FacultyPageProps> = ({ theme, onFacultySelect }) => {
  const { facultyList, loading, error, addFaculty, handleFileUpload, updateFaculty, clearError } = useFacultyData();
  const [activeTab, setActiveTab] = useState<'view' | 'add' | 'upload' | 'edit' | 'manual'>('view');
  
  const [newFaculty, setNewFaculty] = useState({
      empId: '', name: '', dept: '', designation: '', salary: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFaculty(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFaculty.empId && newFaculty.name && newFaculty.dept && newFaculty.designation && newFaculty.salary) {
      addFaculty({
        empId: parseInt(newFaculty.empId, 10),
        name: newFaculty.name,
        dept: newFaculty.dept,
        designation: newFaculty.designation,
        salary: parseFloat(newFaculty.salary),
      });
      setNewFaculty({ empId: '', name: '', dept: '', designation: '', salary: '' }); // Reset form
    } else {
        alert("Please fill all fields");
    }
  };

  const TabButton: React.FC<{
    tabName: typeof activeTab;
    children: React.ReactNode;
  }> = ({ tabName, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        activeTab === tabName
          ? 'bg-highlight text-primary dark:bg-teal-500 dark:text-gray-100'
          : 'text-text-secondary hover:bg-accent hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'view':
        return <FacultyTable data={facultyList} onFacultySelect={onFacultySelect} />;
      case 'add':
        return (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
            <input type="number" name="empId" value={newFaculty.empId} onChange={handleInputChange} placeholder="Employee ID" required className="w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
            <input type="text" name="name" value={newFaculty.name} onChange={handleInputChange} placeholder="Name" required className="w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
            <input type="text" name="dept" value={newFaculty.dept} onChange={handleInputChange} placeholder="Department" required className="w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
            <input type="text" name="designation" value={newFaculty.designation} onChange={handleInputChange} placeholder="Designation" required className="w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
            <input type="number" name="salary" value={newFaculty.salary} onChange={handleInputChange} placeholder="Salary" required className="w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" />
            <button type="submit" disabled={loading} className="w-full bg-highlight text-primary font-bold py-2 px-4 rounded-md hover:bg-teal-300 disabled:bg-gray-500 dark:bg-teal-500 dark:hover:bg-teal-400">
                {loading ? 'Adding...' : 'Add Faculty'}
            </button>
          </form>
        );
      case 'upload':
        return (
          <div className="max-w-md mx-auto">
             <p className="text-sm text-center text-text-secondary dark:text-gray-400 mb-4">Upload an Excel file with columns: empId, name, dept, designation, salary.</p>
             <FacultyFileUpload onFileUpload={handleFileUpload} />
          </div>
        );
      case 'edit':
        return (
            <div className="max-w-md mx-auto">
                <EditFacultyForm facultyList={facultyList} updateFaculty={updateFaculty} loading={loading} />
            </div>
        );
      case 'manual':
        return <ManualAttendance />;
      default:
        return null;
    }
  };

  const tabTitles = {
    view: 'All Faculty',
    add: 'Add New Faculty',
    upload: 'Bulk Upload from Excel',
    edit: 'Edit Faculty Details',
    manual: 'Manual Attendance Marking'
  };

  return (
    <div className="space-y-8">
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
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-highlight dark:text-teal-300">{tabTitles[activeTab]}</h2>
            <nav className="flex flex-wrap items-center gap-2">
                <TabButton tabName="view"><List size={16} /> View All</TabButton>
                <TabButton tabName="add"><UserPlus size={16} /> Add New</TabButton>
                <TabButton tabName="upload"><UploadCloud size={16} /> Bulk Upload</TabButton>
                <TabButton tabName="edit"><Edit size={16} /> Edit Details</TabButton>
                <TabButton tabName="manual"><ClipboardCheck size={16} /> Manual Attendance</TabButton>
            </nav>
        </div>
        <div className="relative">
            {loading && activeTab !== 'edit' && activeTab !== 'manual' && (
                <div className="absolute inset-0 bg-primary/50 dark:bg-gray-900/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-highlight dark:border-teal-300"></div>
                </div>
            )}
            {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FacultyPage;
