
import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config.ts';
import { KeyRound, Loader2, AlertTriangle, UserPlus, CheckCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle.tsx';
import { FacultyRecord } from '../types.ts';
import { useSettings } from './SettingsContext.tsx';

interface UserAccount {
  username: string;
  password?: string; // This is base64 encoded
}

interface LoginPageProps {
  onLoginSuccess: (user: { username: string; role: 'admin' | 'faculty'; empId?: number }) => void;
  onGoToRegister: () => void;
  onGoToAdminRegister: () => void;
  successMessage?: string;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onGoToRegister, onGoToAdminRegister, successMessage, theme, onThemeToggle }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSuccessMessage, setLocalSuccessMessage] = useState(successMessage);
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    if (successMessage) {
      setLocalSuccessMessage(successMessage);
      const timer = setTimeout(() => {
        setLocalSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Check for admin/general user
      const userRef = db.ref(`users/${username}`);
      const userSnapshot = await userRef.get();

      if (userSnapshot.exists()) {
        const userData: UserAccount = {username, ...userSnapshot.val()};
        if (userData.password && atob(userData.password) === password) {
          onLoginSuccess({ username: userData.username, role: 'admin' });
          return;
        }
      }

      // 2. Check for faculty user
      const facultyRef = db.ref('faculty');
      const facultySnapshot = await facultyRef.get();
      if (facultySnapshot.exists()) {
        const facultyData = facultySnapshot.val();
        for (const empId in facultyData) {
          const faculty: FacultyRecord = { empId: parseInt(empId), ...facultyData[empId] };
          if (faculty.username === username) {
            if (faculty.password && atob(faculty.password) === password) {
              onLoginSuccess({ username: faculty.username, role: 'faculty', empId: faculty.empId });
              return;
            }
          }
        }
      }

      // 3. If no match found
      throw new Error("Invalid username or password.");

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary dark:bg-gray-900 p-4 font-sans relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 text-highlight dark:text-teal-300 bg-highlight/10 rounded-full flex items-center justify-center">
            <KeyRound size={32} />
          </div>
          <h1 className="mt-4 text-3xl font-bold text-highlight dark:text-teal-300">
            ACT HR Portal
          </h1>
          <p className="text-text-secondary dark:text-gray-400">Please sign in to continue</p>
        </div>

        <div className="p-8 bg-secondary rounded-xl shadow-lg dark:bg-gray-800">
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-900/50 dark:text-red-300">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {localSuccessMessage && (
            <div className="mb-4 flex items-start gap-2 p-3 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-900/50 dark:text-green-300">
              <CheckCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{localSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="mt-1 w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:ring-highlight focus:border-highlight"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full bg-primary border border-accent rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 focus:ring-highlight focus:border-highlight"
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 bg-highlight text-primary font-bold py-2 px-4 rounded-md hover:bg-teal-300 disabled:bg-gray-500 transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Login'}
              </button>
            </div>
          </form>

          {(settings.accountCreationEnabled || settings.userAccountRequestEnabled) && !settingsLoading && (
            <div className="mt-6 text-center text-sm">
                <p className="text-text-secondary dark:text-gray-400">Don't have an account?</p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center mt-2">
                    {settings.accountCreationEnabled && (
                        <button onClick={onGoToRegister} className="flex items-center justify-center gap-2 text-highlight hover:underline dark:text-teal-400">
                            <UserPlus size={16}/> Register as Faculty
                        </button>
                    )}
                    {settings.userAccountRequestEnabled && (
                         <button onClick={onGoToAdminRegister} className="flex items-center justify-center gap-2 text-highlight hover:underline dark:text-teal-400">
                            <UserPlus size={16}/> Request Admin Account
                        </button>
                    )}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
