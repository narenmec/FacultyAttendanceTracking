import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase/config';

interface UserAccount {
  username: string;
  password?: string;
}

export const useUserManagementData = () => {
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [existingUsers, setExistingUsers] = useState<UserAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch both pending and existing users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingRef = db.ref('pendingUsers');
      const usersRef = db.ref('users');

      const [pendingSnapshot, usersSnapshot] = await Promise.all([
        pendingRef.get(),
        usersRef.get(),
      ]);

      if (pendingSnapshot.exists()) {
        const dataFromDb = pendingSnapshot.val();
        const loadedUsers: UserAccount[] = Object.values(dataFromDb);
        setPendingUsers(loadedUsers);
      } else {
        setPendingUsers([]);
      }
      
      if (usersSnapshot.exists()) {
        const dataFromDb = usersSnapshot.val();
        const loadedUsers: UserAccount[] = Object.values(dataFromDb);
        // Don't include admin in the list of users whose passwords can be changed
        setExistingUsers(loadedUsers.filter(u => u.username !== 'admin'));
      } else {
        setExistingUsers([]);
      }

    } catch (err) {
      console.error('Error fetching users from Firebase: ', err);
      setError('Failed to load user data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Approve a user and move them from pending to active users
  const approveUser = useCallback(async (user: UserAccount) => {
    setError(null);
    try {
      const userRef = db.ref(`users/${user.username}`);
      const pendingRef = db.ref(`pendingUsers/${user.username}`);

      await userRef.set({
        username: user.username,
        password: user.password,
      });
      await pendingRef.remove();
      
      // Refresh local state
      setPendingUsers((prev) => prev.filter((p) => p.username !== user.username));
      setExistingUsers((prev) => [...prev, user]);
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user. Please try again.');
      throw err;
    }
  }, []);

  // Reject a user by removing them from the pending list
  const rejectUser = useCallback(async (username: string) => {
    setError(null);
    try {
      const pendingRef = db.ref(`pendingUsers/${username}`);
      await pendingRef.remove();
      setPendingUsers((prev) => prev.filter((p) => p.username !== username));
    } catch (err) {
      console.error('Failed to reject user:', err);
      setError('Failed to reject user. Please try again.');
      throw err;
    }
  }, []);
  
  // Change a user's password, with an optional old password check
  const changeUserPassword = useCallback(async (username: string, newPassword: string, oldPassword?: string) => {
    setError(null);
    try {
        const userRef = db.ref(`users/${username}`);
        // If oldPassword is provided, we need to verify it first.
        if (oldPassword) {
            const userSnapshot = await userRef.get();
            if (userSnapshot.exists()) {
                const userData = userSnapshot.val();
                if (userData.password && atob(userData.password) === oldPassword) {
                    // Old password matches, proceed to update.
                    await userRef.child('password').set(btoa(newPassword));
                } else {
                    throw new Error("The old password does not match.");
                }
            } else {
                throw new Error("User not found.");
            }
        } else {
            // No oldPassword, so it's a force reset.
            await userRef.child('password').set(btoa(newPassword));
        }
    } catch (err) {
        console.error('Error changing password:', err);
        const message = err instanceof Error ? err.message : 'Failed to change password. Please check permissions.';
        setError(message);
        throw new Error(message);
    }
  }, []);


  return {
    pendingUsers,
    existingUsers,
    error,
    loading,
    approveUser,
    rejectUser,
    changeUserPassword,
    refresh: fetchUsers,
    clearError: () => setError(null),
  };
};