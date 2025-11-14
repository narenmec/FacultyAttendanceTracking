import { useState, useCallback, useEffect } from 'react';
import { db } from '../firebase/config';
import { FacultyRecord } from '../types';

interface UserAccount {
  username: string;
  password?: string;
}

export const useUserManagementData = () => {
  const [pendingUsers, setPendingUsers] = useState<UserAccount[]>([]);
  const [existingUsers, setExistingUsers] = useState<UserAccount[]>([]);
  const [registeredFaculty, setRegisteredFaculty] = useState<FacultyRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch both pending and existing users
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
        const loadedUsers: UserAccount[] = Object.values(dataFromDb);
        setPendingUsers(loadedUsers);
      } else {
        setPendingUsers([]);
      }
      
      const combinedExistingUsers: UserAccount[] = [];
      const regFaculty: FacultyRecord[] = [];

      if (facultySnapshot.exists()) {
        const facultyData = facultySnapshot.val();
        Object.keys(facultyData).forEach(empId => {
            const faculty = { empId: parseInt(empId), ...facultyData[empId] };
            if (faculty.registered && faculty.username) {
                combinedExistingUsers.push({ username: faculty.username });
                regFaculty.push(faculty);
            }
        });
        setRegisteredFaculty(regFaculty.sort((a,b) => a.name.localeCompare(b.name)));
      }
      
      if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const generalUsers: UserAccount[] = Object.values(usersData)
              .filter((user: any) => user && user.username)
              .map((user: any) => ({
                  username: user.username,
              }));
          combinedExistingUsers.push(...generalUsers);
      }

      setExistingUsers(combinedExistingUsers);

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
        // First, check if it's a general user (e.g., admin, dean)
        const userRef = db.ref(`users/${username}`);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists()) {
             if (oldPassword) {
                if (userSnapshot.val().password && atob(userSnapshot.val().password) === oldPassword) {
                    await userRef.update({ password: btoa(newPassword) });
                } else {
                    throw new Error("The old password does not match.");
                }
            } else {
                // Admin is forcing a password reset, no old password check needed.
                await userRef.update({ password: btoa(newPassword) });
            }
        } else {
            // If not a general user, check faculty
            const facultyRef = db.ref('faculty');
            const facultySnapshot = await facultyRef.get();
            
            if (!facultySnapshot.exists()) {
                throw new Error("No faculty data found.");
            }

            const facultyData = facultySnapshot.val();
            let empId: string | null = null;
            let facultyDetails: FacultyRecord | null = null;

            for (const id in facultyData) {
                if (facultyData[id].username === username) {
                    empId = id;
                    facultyDetails = facultyData[id];
                    break;
                }
            }

            if (!empId || !facultyDetails) {
                throw new Error(`User '${username}' not found.`);
            }

            const facultyUpdateRef = db.ref(`faculty/${empId}`);

            if (oldPassword) {
                if (facultyDetails.password && atob(facultyDetails.password) === oldPassword) {
                    await facultyUpdateRef.update({ password: btoa(newPassword) });
                } else {
                    throw new Error("The old password does not match.");
                }
            } else {
                // Admin is forcing a password reset, no old password check needed.
                await facultyUpdateRef.update({ password: btoa(newPassword) });
            }
        }
    } catch (err) {
        console.error('Error changing password:', err);
        const message = err instanceof Error ? err.message : 'Failed to change password. Please check permissions.';
        setError(message);
        throw new Error(message);
    }
  }, []);
  
  const resetFacultyAccount = useCallback(async (empId: number) => {
    setError(null);
    try {
        const facultyRef = db.ref(`faculty/${empId}`);
        await facultyRef.update({
            username: null,
            password: null,
            registered: null,
        });
        // After reset, refresh all user data to update the UI correctly
        await fetchUsers();
    } catch(err) {
        console.error("Error resetting faculty account:", err);
        const message = "Failed to reset faculty account. Please try again.";
        setError(message);
        throw new Error(message);
    }
  }, [fetchUsers]);


  return {
    pendingUsers,
    existingUsers,
    registeredFaculty,
    error,
    loading,
    approveUser,
    rejectUser,
    changeUserPassword,
    resetFacultyAccount,
    refresh: fetchUsers,
    clearError: () => setError(null),
  };
};