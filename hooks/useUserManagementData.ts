import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase/config';
import { FacultyRecord } from '../types';

interface UserAccount {
  username: string;
  password?: string;
}

export interface UnifiedUser {
  username: string;
  name?: string;
  empId?: number;
  role: 'admin' | 'faculty';
}

const encodeEmailForKey = (email: string) => email.replace(/\./g, ',');

export const useUserManagementData = () => {
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [allUsers, setAllUsers] = useState<UnifiedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingRef = db.ref('pendingUsers');
      const facultyRef = db.ref('faculty');
      const usersRef = db.ref('users');

      const [pendingSnapshot, facultySnapshot, usersSnapshot] = await Promise.all([
        pendingRef.get(),
        facultyRef.get(),
        usersRef.get(),
      ]);

      if (pendingSnapshot.exists()) {
        const dataFromDb = pendingSnapshot.val();
        setPendingUsers(Object.values(dataFromDb));
      } else {
        setPendingUsers([]);
      }
      
      const combinedUsers: UnifiedUser[] = [];

      if (facultySnapshot.exists()) {
        const facultyData = facultySnapshot.val();
        Object.keys(facultyData).forEach(empId => {
            const faculty: FacultyRecord = { empId: parseInt(empId), ...facultyData[empId] };
            if (faculty.registered && faculty.username) {
                combinedUsers.push({
                    username: faculty.username,
                    name: faculty.name,
                    empId: faculty.empId,
                    role: 'faculty'
                });
            }
        });
      }
      
      if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          Object.values(usersData).forEach((user: any) => {
              if (user && user.username) {
                  combinedUsers.push({
                      username: user.username,
                      name: 'N/A', // Admins don't have a 'name' field in this structure
                      role: 'admin'
                  });
              }
          });
      }
      
      setAllUsers(combinedUsers.sort((a,b) => a.username.localeCompare(b.username)));

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

  const approveUser = useCallback(async (user: UserAccount) => {
    setError(null);
    try {
      const encodedUsername = encodeEmailForKey(user.username);
      const userRef = db.ref(`users/${encodedUsername}`);
      const pendingRef = db.ref(`pendingUsers/${encodedUsername}`);

      await userRef.set({
        username: user.username,
        password: user.password,
      });
      await pendingRef.remove();
      
      await fetchUsers();
    } catch (err) {
      console.error('Error approving user:', err);
      setError('Failed to approve user. Please try again.');
      throw err;
    }
  }, [fetchUsers]);

  const rejectUser = useCallback(async (username: string) => {
    setError(null);
    try {
      const encodedUsername = encodeEmailForKey(username);
      const pendingRef = db.ref(`pendingUsers/${encodedUsername}`);
      await pendingRef.remove();
      setPendingUsers((prev) => prev.filter((p) => p.username !== username));
    } catch (err) {
      console.error('Failed to reject user:', err);
      setError('Failed to reject user. Please try again.');
      throw err;
    }
  }, []);
  
  const changeUserPassword = useCallback(async (username: string, newPassword: string) => {
    setError(null);
    try {
        const encodedUsername = encodeEmailForKey(username);
        const userRef = db.ref(`users/${encodedUsername}`);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists()) {
            await userRef.update({ password: btoa(newPassword) });
        } else {
            const facultyRef = db.ref('faculty');
            const facultySnapshot = await facultyRef.orderByChild('username').equalTo(username).get();
            
            if (!facultySnapshot.exists()) {
                throw new Error(`User '${username}' not found.`);
            }
            
            const empId = Object.keys(facultySnapshot.val())[0];
            const facultyUpdateRef = db.ref(`faculty/${empId}`);
            await facultyUpdateRef.update({ password: btoa(newPassword) });
        }
    } catch (err) {
        console.error('Error changing password:', err);
        const message = err instanceof Error ? err.message : 'Failed to change password. Please check permissions.';
        setError(message);
        throw new Error(message);
    }
  }, []);
  
  const deleteUser = useCallback(async (user: UnifiedUser) => {
    setError(null);
    try {
      if (user.role === 'faculty' && user.empId) {
        const facultyRef = db.ref(`faculty/${user.empId}`);
        await facultyRef.update({
            username: null,
            password: null,
            registered: null,
        });
      } else if (user.role === 'admin') {
        const encodedUsername = encodeEmailForKey(user.username);
        const userRef = db.ref(`users/${encodedUsername}`);
        await userRef.remove();
      } else {
          throw new Error("Invalid user type for deletion.");
      }
      await fetchUsers();
    } catch(err) {
        console.error("Error deleting/resetting user:", err);
        const message = "Failed to process request. Please try again.";
        setError(message);
        throw new Error(message);
    }
  }, [fetchUsers]);


  return {
    pendingUsers,
    allUsers,
    error,
    loading,
    approveUser,
    rejectUser,
    changeUserPassword,
    deleteUser,
    refresh: fetchUsers,
    clearError: () => setError(null),
  };
};
