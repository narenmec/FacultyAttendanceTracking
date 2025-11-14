import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { KeyRound, Loader2, AlertTriangle, Info, UserPlus, CheckCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { FacultyRecord } from '../types';
import { useSettings } from './SettingsContext';

interface UserAccount {
  username: string;
  password?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // For login button action
  const [initialLoading, setInitialLoading] = useState(true); // For initial data fetch

  const [allFaculty, setAllFaculty] = useState<FacultyRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [allPendingUsers, setAllPendingUsers] = useState<UserAccount[]>([]);

  const { settings } = useSettings();

  useEffect(() => {
    // Fetch all user types once on component mount to avoid invalid path errors on login attempts.
    const fetchAllUserData = async () => {
        setInitialLoading(true);
        setError(null);
        try {
            const facultyRef = db.ref('faculty');
            const usersRef = db.ref('users');
            const pendingUsersRef = db.ref('pendingUsers');

            const [facultySnapshot, usersSnapshot, pendingUsersSnapshot] = await Promise.all([
                facultyRef.get(),
                usersRef.get(),
                pendingUsersRef.get()
            ]);

            if (facultySnapshot.exists()) {
                const data = facultySnapshot.val();
                const list: FacultyRecord[] = Object.keys(data).map(empId => ({
                    empId: parseInt(empId),
                    ...data[empId]
                }));
                setAllFaculty(list);
            }

            if (usersSnapshot.exists()) {
                setAllUsers(Object.values(usersSnapshot.val()));
            }

            if (pendingUsersSnapshot.exists()) {
                setAllPendingUsers(Object.values(pendingUsersSnapshot.val()));
            }
        } catch (err) {
            console.error("Error fetching user data for login:", err);
            setError("Could not connect to the database to verify users.");
        } finally {
            setInitialLoading(false);
        }
    };
    fetchAllUserData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    setError(null);

    // Use a short delay to ensure UI updates before synchronous check,
    // which might block the main thread momentarily on large datasets.
    setTimeout(() => {
        try {
          const cleanUsername = username.trim();
          
          // 1. Check for approved general users (admin, dean, etc.) against pre-fetched data
          const generalUser = allUsers.find(u => u.username === cleanUsername);
          if (generalUser && generalUser.password) {
              if (atob(generalUser.password) === password) {
                  onLoginSuccess({ username: cleanUsername, role: 'admin' });
                  setLoading(false);
                  return;
              }
          }
    
          // 2. Check for Faculty against pre-fetched data
          const facultyUser = allFaculty.find(f => f.username === cleanUsername && f.registered);
          if (facultyUser) {
              if (facultyUser.password && atob(facultyUser.password) === password) {
                  onLoginSuccess({ username: facultyUser.username!, role: 'faculty', empId: facultyUser.empId });
                  setLoading(false);
                  return;
              }
          }
          
          // 3. If no user found, check pending users against pre-fetched data
          const pendingUser = allPendingUsers.find(u => u.username === cleanUsername);
          if (pendingUser) {
            setError("Your account is pending approval by an administrator.");
            setLoading(false);
            return;
          }
          
          setError('Invalid username or password.');
    
        } catch (err) {
          console.error("Login error:", err);
          setError("An error occurred during login. Please try again.");
        } finally {
          setLoading(false);
        }
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary dark:bg-gray-900 p-4 font-sans relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-highlight dark:text-teal-300">
            ACT HR Management
          </h1>
          <p className="text-text-secondary dark:text-gray-400">
            Please sign in to continue
          </p>
        </div>

        <div className="p-8 space-y-6 bg-secondary rounded-xl shadow-lg dark:bg-gray-800">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full bg-primary border border-accent rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full bg-primary border border-accent rounded-md shadow-sm py-2 px-3 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}
            
            {successMessage && !error && (
              <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading || initialLoading}
                className="w-full py-2 px-4 flex items-center justify-center gap-2 rounded-md bg-highlight text-primary dark:bg-teal-500 disabled:opacity-50"
              >
                {loading || initialLoading ? <Loader2 className="animate-spin" /> : <KeyRound size={18} />}
                Sign In
              </button>
            </div>
          </form>
           <div className="mt-4 text-center text-sm text-text-secondary dark:text-gray-400">
                {settings.accountCreationEnabled && (
                    <button onClick={onGoToRegister} className="text-highlight hover:underline dark:text-teal-300">
                        Faculty Registration
                    </button>
                )}
                 {settings.accountCreationEnabled && settings.userAccountRequestEnabled && (
                    <span className="mx-2">|</span>
                )}
                {settings.userAccountRequestEnabled && (
                    <button onClick={onGoToAdminRegister} className="text-highlight hover:underline dark:text-teal-300">
                        Request User Account
                    </button>
                )}
            </div>
        </div>

        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex gap-3">
          <Info size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p>
              Admins and other general users must use the provided credentials or request an account for approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;