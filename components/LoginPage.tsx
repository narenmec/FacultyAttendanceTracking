import React, { useState } from 'react';
import { db } from '../firebase/config';
import { KeyRound, Loader2, AlertTriangle, Info, UserPlus, CheckCircle } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useSettings } from './SettingsContext';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, theme, onThemeToggle }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creationSuccess, setCreationSuccess] = useState(false);
  const { settings, loading: settingsLoading } = useSettings();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setCreationSuccess(false);

    try {
      const cleanUsername = username.trim();
      const userRef = db.ref(`users/${cleanUsername}`);
      const userSnapshot = await userRef.get();

      if (userSnapshot.exists()) {
        const userData = userSnapshot.val();
        // The database stores passwords as base64, so we need to decode it first.
        if (userData.password && atob(userData.password) === password) {
          onLoginSuccess(cleanUsername);
        } else {
          setError('Invalid username or password.');
        }
      } else {
        // If not in users, check pending
        const pendingRef = db.ref(`pendingUsers/${cleanUsername}`);
        const pendingSnapshot = await pendingRef.get();
        if (pendingSnapshot.exists()) {
          setError("Your account is pending approval by an administrator.");
        } else {
          setError('Invalid username or password.');
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    setError(null);
    setCreationSuccess(false);

    try {
      const cleanUsername = username.trim();
      if (cleanUsername === 'admin') {
        setError("Cannot create a user with the username 'admin'.");
        return;
      }

      const userRef = db.ref(`users/${cleanUsername}`);
      const pendingRef = db.ref(`pendingUsers/${cleanUsername}`);
      
      const [userSnapshot, pendingSnapshot] = await Promise.all([userRef.get(), pendingRef.get()]);

      if (userSnapshot.exists() || pendingSnapshot.exists()) {
        setError("This username is already taken or pending approval.");
        return;
      }

      await pendingRef.set({
        username: cleanUsername,
        password: btoa(password), // Store password as base64
      });

      setCreationSuccess(true);
      setUsername('');
      setPassword('');
    } catch (err) {
      console.error("Create user error:", err);
      setError("Failed to create account. Please check database permissions.");
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
          <h1 className="text-3xl font-bold text-highlight dark:text-teal-300">
            Faculty Attendance
          </h1>
          <p className="text-text-secondary dark:text-gray-400">
            Please sign in or create an account
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
            
            {creationSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle size={16} />
                <span>Account created. Please wait for admin approval.</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading || settingsLoading}
                className="w-full py-2 px-4 flex items-center justify-center gap-2 rounded-md bg-highlight text-primary dark:bg-teal-500 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <KeyRound size={18} />}
                Sign In
              </button>
              
              {settings.accountCreationEnabled && (
                <button
                    type="button"
                    onClick={handleCreateAccount}
                    disabled={loading || settingsLoading}
                    className="w-full py-2 px-4 flex items-center justify-center gap-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                    Create Account
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-6 p-4 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-sm text-blue-800 dark:text-blue-300 flex gap-3">
          <Info size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            {/* 
            <p>
              Default admin: <strong>admin</strong> / <strong>password</strong>
            </p>
            */}
            
            <p className="mt-1">
              New accounts require admin approval before you can log in.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;