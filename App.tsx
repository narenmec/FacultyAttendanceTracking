
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import UploadPage from './components/UploadPage';
import FacultyPage from './components/FacultyPage';
import SummaryPage from './components/SummaryPage';
import SettingsPage from './components/SettingsPage';
import FacultyDetailPage from './components/FacultyDetailPage';
import LoginPage from './components/LoginPage';
import UserManagementPage from './components/UserManagementPage';
import { useAttendanceData } from './hooks/useAttendanceData';
import { LayoutDashboard, Upload, Users, Sheet, Settings as SettingsIcon, LogOut, UserCog } from 'lucide-react';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  const [page, setPage] = useState<'dashboard' | 'upload' | 'faculty' | 'summary' | 'settings' | 'facultyDetail' | 'userManagement'>('dashboard');
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [previousPage, setPreviousPage] = useState<'dashboard' | 'faculty' | 'summary'>('dashboard');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );
  const attendanceData = useAttendanceData();

  useEffect(() => {
    // Check session storage on initial load
    const loggedIn = sessionStorage.getItem('isAuthenticated');
    const user = sessionStorage.getItem('currentUser');
    if (loggedIn === 'true' && user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLoginSuccess = (username: string) => {
    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('currentUser', username);
    setIsAuthenticated(true);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setPage('dashboard'); // Reset to default page on logout
  };

  const handleThemeToggle = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  const handleFacultySelect = (empId: number) => {
    if(page === 'dashboard' || page === 'faculty' || page === 'summary') {
      setPreviousPage(page);
    }
    setSelectedEmpId(empId);
    setPage('facultyDetail');
  };

  const handleBack = () => {
    setSelectedEmpId(null);
    setPage(previousPage);
  };

  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-highlight text-primary dark:bg-teal-500 dark:text-gray-100'
          : 'text-text-secondary hover:bg-accent hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
  
  const renderPage = () => {
    switch(page) {
      case 'dashboard':
        return <Dashboard {...attendanceData} theme={theme} onFacultySelect={handleFacultySelect} />;
      case 'upload':
        return <UploadPage
            handleFileUpload={attendanceData.handleFileUpload}
            loading={attendanceData.loading}
            uploadStatus={attendanceData.uploadStatus}
            clearUploadStatus={attendanceData.clearUploadStatus}
          />;
      case 'faculty':
        return <FacultyPage theme={theme} onFacultySelect={handleFacultySelect} />;
      case 'summary':
        return <SummaryPage onFacultySelect={handleFacultySelect} />;
      case 'settings':
        return <SettingsPage />;
      case 'facultyDetail':
        return selectedEmpId ? <FacultyDetailPage empId={selectedEmpId} onBack={handleBack} theme={theme} /> : <Dashboard {...attendanceData} theme={theme} onFacultySelect={handleFacultySelect} />;
      case 'userManagement':
        return <UserManagementPage />;
      default:
        return <Dashboard {...attendanceData} theme={theme} onFacultySelect={handleFacultySelect} />;
    }
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} theme={theme} onThemeToggle={handleThemeToggle} />;
  }

  return (
    <div className="min-h-screen bg-primary font-sans dark:bg-gray-900">
      <header className="bg-secondary p-4 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4 dark:bg-gray-800 dark:border-b dark:border-gray-700">
        <h1 className="text-xl md:text-2xl font-bold text-highlight text-center sm:text-left dark:text-teal-300">
          Faculty Attendance
        </h1>
        <nav className="flex items-center gap-2 flex-wrap justify-center">
          <NavButton active={page === 'dashboard'} onClick={() => setPage('dashboard')}>
            <LayoutDashboard size={16} />
            Dashboard
          </NavButton>
          <NavButton active={page === 'upload'} onClick={() => setPage('upload')}>
            <Upload size={16} />
            Upload Data
          </NavButton>
          <NavButton active={page === 'faculty'} onClick={() => setPage('faculty')}>
            <Users size={16} />
            Faculty
          </NavButton>
          <NavButton active={page === 'summary'} onClick={() => setPage('summary')}>
            <Sheet size={16} />
            Summary
          </NavButton>
          <NavButton active={page === 'settings'} onClick={() => setPage('settings')}>
            <SettingsIcon size={16} />
            Settings
          </NavButton>
          {currentUser === 'admin' && (
             <NavButton active={page === 'userManagement'} onClick={() => setPage('userManagement')}>
                <UserCog size={16} />
                User Management
             </NavButton>
          )}
          <ThemeToggle theme={theme} onToggle={handleThemeToggle} />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      </header>
      <main className="p-4 md:p-8">
        {renderPage()}
      </main>
      <footer className="text-center p-4 text-text-secondary text-sm dark:text-gray-400">
        <p>Built with React, Tailwind CSS, and Firebase</p>
      </footer>
    </div>
  );
};

export default App;
