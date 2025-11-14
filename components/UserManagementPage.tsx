
import React, { useState, useMemo } from 'react';
import { useUserManagementData } from '../hooks/useUserManagementData.ts';
import { useSettings } from './SettingsContext.tsx';
import { Loader2, UserCheck, UserX, AlertTriangle, RefreshCw, CheckCircle, ShieldCheck, Users, Edit, Search, KeyRound, Cog, UserRoundX } from 'lucide-react';
import { FacultyRecord } from '../types.ts';

interface UserAccount {
    username: string;
    password?: string;
}

const UserManagementPage: React.FC = () => {
    const { pendingUsers, existingUsers, registeredFaculty, loading, error, approveUser, rejectUser, changeUserPassword, resetFacultyAccount, refresh, clearError } = useUserManagementData();
    const { settings, updateSettings, loading: settingsLoading } = useSettings();
    const [actionState, setActionState] = useState<{ type: 'approving' | 'rejecting'; username: string } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);
    const [activeTab, setActiveTab] = useState<'approvals' | 'password' | 'settings' | 'facultyReset'>('approvals');

    // State for password change feature
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [forceReset, setForceReset] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    // State for faculty reset feature
    const [facultySearch, setFacultySearch] = useState('');
    const [selectedFacultyForReset, setSelectedFacultyForReset] = useState<FacultyRecord | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);


    const handleApprove = async (user: UserAccount) => {
        setActionState({ type: 'approving', username: user.username });
        setFeedback(null);
        clearError();
        try {
            await approveUser(user);
            setFeedback({ type: 'success', message: `User '${user.username}' has been approved.` });
        } catch (err) {
            setFeedback({ type: 'error', message: `Failed to approve '${user.username}'.` });
        } finally {
            setActionState(null);
        }
    };

    const handleReject = async (username: string) => {
        if (!window.confirm(`Are you sure you want to reject the user '${username}'? This action cannot be undone.`)) {
            return;
        }
        setActionState({ type: 'rejecting', username });
        setFeedback(null);
        clearError();
        try {
            await rejectUser(username);
            setFeedback({ type: 'success', message: `User '${username}' has been rejected.` });
        } catch (err) {
            setFeedback({ type: 'error', message: `Failed to reject '${username}'.` });
        } finally {
            setActionState(null);
        }
    };
    
    const handleToggleAccountCreation = async () => {
        setIsUpdatingSetting(true);
        try {
            await updateSettings({
                ...settings,
                accountCreationEnabled: !settings.accountCreationEnabled
            });
        } catch (e) {
            // Error is handled in the context
        } finally {
            setIsUpdatingSetting(false);
        }
    };

    const handleToggleUserAccountRequest = async () => {
        setIsUpdatingSetting(true);
        try {
            await updateSettings({
                ...settings,
                userAccountRequestEnabled: !settings.userAccountRequestEnabled
            });
        } catch (e) {
            // Error is handled in the context
        } finally {
            setIsUpdatingSetting(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !newPassword) return;

        if (newPassword !== confirmNewPassword) {
            setFeedback({ type: 'error', message: 'New passwords do not match.' });
            return;
        }

        setIsChangingPassword(true);
        setFeedback(null);
        clearError();
        try {
            await changeUserPassword(selectedUser.username, newPassword, forceReset ? undefined : oldPassword);
            setFeedback({ type: 'success', message: `Password for '${selectedUser.username}' has been updated.` });
            setSelectedUser(null);
            setNewPassword('');
            setOldPassword('');
            setConfirmNewPassword('');
            setForceReset(false);
            setSearchQuery('');
        } catch (err) {
            setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to change password.' });
        } finally {
            setIsChangingPassword(false);
        }
    };
    
    const handleConfirmReset = async () => {
        if (!selectedFacultyForReset) return;
        setIsResetting(true);
        setFeedback(null);
        clearError();
        try {
            await resetFacultyAccount(selectedFacultyForReset.empId);
            setFeedback({ type: 'success', message: `Account for ${selectedFacultyForReset.name} has been reset.` });
            setSelectedFacultyForReset(null);
        } catch (err) {
            setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Failed to reset account.' });
        } finally {
            setIsResetting(false);
            setIsResetModalOpen(false);
        }
    };

    const searchResults = useMemo(() => {
        if (!searchQuery) return [];
        return existingUsers
            .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
            .slice(0, 5);
    }, [searchQuery, existingUsers]);
    
    const facultySearchResults = useMemo(() => {
        if (!facultySearch) return [];
        return registeredFaculty
            .filter(f => f.name.toLowerCase().includes(facultySearch.toLowerCase()) || String(f.empId).includes(facultySearch))
            .slice(0, 5);
    }, [facultySearch, registeredFaculty]);


    const handleSelectUser = (user: UserAccount) => {
        setSelectedUser(user);
        setSearchQuery('');
        setFeedback(null);
    };
    
    const handleSelectFacultyForReset = (faculty: FacultyRecord) => {
        setSelectedFacultyForReset(faculty);
        setFacultySearch('');
        setFeedback(null);
    };

    const ToggleSwitch: React.FC<{ enabled: boolean; onToggle: () => void; disabled?: boolean }> = ({ enabled, onToggle, disabled }) => (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={onToggle}
            disabled={disabled}
            className={`${
                enabled ? 'bg-highlight' : 'bg-gray-300 dark:bg-gray-600'
            } relative inline-flex items-center h-6 rounded-full w-11 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-highlight dark:focus:ring-offset-gray-800`}
        >
            <span
                className={`${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`}
            />
        </button>
    );

    const TabButton: React.FC<{
        tabName: typeof activeTab;
        children: React.ReactNode;
    }> = ({ tabName, children }) => (
        <button
          onClick={() => setActiveTab(tabName)}
          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === tabName
              ? 'bg-highlight text-primary dark:bg-teal-500 dark:text-gray-100'
              : 'text-text-secondary hover:bg-accent hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
          }`}
        >
          {children}
        </button>
    );

    const tabTitles = {
        approvals: 'Pending Approval Requests',
        password: 'Change User Password',
        facultyReset: 'Reset Faculty Account',
        settings: 'Registration Settings'
    };

    const tabDescriptions = {
        approvals: 'Approve or reject new user accounts.',
        password: 'Find a user and update their password.',
        facultyReset: 'Clear a faculty member\'s login to allow them to re-register.',
        settings: 'Control whether new users can register.'
    };

    const renderContent = () => {
        if (error && !feedback) {
            return (
                 <div className="mb-4 bg-red-100 border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-center dark:bg-red-900/50 dark:border-red-700 dark:text-red-300" role="alert">
                    <strong className="font-bold mr-2">Error:</strong>
                    <span className="block sm:inline">{error}</span>
                    <button onClick={clearError} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>
            );
        }

        switch (activeTab) {
            case 'approvals':
                return loading ? (
                     <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-highlight" />
                     </div>
                ) : pendingUsers.length === 0 ? (
                    <div className="text-center py-10 px-6 bg-primary rounded-lg dark:bg-gray-900/50">
                        <Users className="mx-auto h-12 w-12 text-highlight dark:text-teal-300" />
                        <h3 className="mt-4 text-xl font-semibold text-text-primary dark:text-gray-200">No Pending Requests</h3>
                        <p className="mt-1 text-text-secondary dark:text-gray-400">
                            There are currently no new user accounts awaiting approval.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingUsers.map(user => {
                            const isActing = actionState?.username === user.username;
                            return (
                                <div key={user.username} className="bg-primary dark:bg-gray-900/80 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="font-semibold text-text-primary dark:text-gray-200">{user.username}</p>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleApprove(user)} 
                                            disabled={isActing}
                                            className="w-28 flex justify-center items-center gap-2 px-3 py-1 text-sm rounded-md bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                                        >
                                            {isActing && actionState.type === 'approving' ? <Loader2 className="h-4 w-4 animate-spin"/> : <><UserCheck size={16}/> Approve</>}
                                        </button>
                                        <button 
                                            onClick={() => handleReject(user.username)}
                                            disabled={isActing}
                                            className="w-28 flex justify-center items-center gap-2 px-3 py-1 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-400 transition-colors"
                                        >
                                            {isActing && actionState.type === 'rejecting' ? <Loader2 className="h-4 w-4 animate-spin"/> : <><UserX size={16}/> Reject</>}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            case 'password':
                return (
                    <div className="max-w-md">
                        <div className="space-y-2 relative">
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                                1. Find User to Edit
                            </label>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Search by username..."
                                    className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                    disabled={!!selectedUser}
                                />
                            </div>
                            {searchResults.length > 0 && searchQuery && (
                                <ul className="absolute z-10 w-full mt-1 bg-secondary border border-accent rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-600">
                                    {searchResults.map(u => (
                                        <li key={u.username} onClick={() => handleSelectUser(u)} className="p-2 cursor-pointer hover:bg-accent dark:hover:bg-gray-700">
                                            {u.username}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        
                        {selectedUser && (
                            <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                                <div>
                                    <h4 className="font-semibold text-text-primary dark:text-gray-200">2. Set New Password for {selectedUser.username}</h4>
                                </div>
                                 <div className="flex items-center gap-2 p-2 rounded-md bg-primary dark:bg-gray-900/50">
                                    <input 
                                        type="checkbox" 
                                        id="force-reset"
                                        checked={forceReset} 
                                        onChange={(e) => {
                                            setForceReset(e.target.checked);
                                            setOldPassword('');
                                        }}
                                        className="h-4 w-4 rounded border-gray-300 text-highlight focus:ring-highlight"
                                    />
                                    <label htmlFor="force-reset" className="text-sm text-text-secondary dark:text-gray-400">
                                        Force reset password (ignores old password)
                                    </label>
                                </div>
                                
                                {!forceReset && (
                                    <div>
                                        <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">Old Password</label>
                                        <input
                                            type="password"
                                            value={oldPassword}
                                            onChange={e => setOldPassword(e.target.value)}
                                            required
                                            placeholder="Enter user's current password"
                                            className="w-full bg-primary border border-accent rounded-md p-2 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                        />
                                    </div>
                                )}
                                 <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        placeholder="Enter new password"
                                        className="w-full bg-primary border border-accent rounded-md p-2 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                    />
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={e => setConfirmNewPassword(e.target.value)}
                                        required
                                        placeholder="Confirm new password"
                                        className="w-full bg-primary border border-accent rounded-md p-2 mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <button type="submit" disabled={isChangingPassword} className="w-auto flex justify-center items-center gap-2 bg-highlight text-primary font-bold py-2 px-4 rounded-md hover:bg-teal-300 disabled:bg-gray-500 dark:bg-teal-500 dark:hover:bg-teal-400">
                                        {isChangingPassword ? <><Loader2 className="h-5 w-5 animate-spin"/> Updating...</> : <><Edit size={16}/> Change Password</>}
                                    </button>
                                    <button type="button" onClick={() => setSelectedUser(null)} className="text-sm text-text-secondary hover:underline dark:text-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                );
            case 'facultyReset':
                return (
                    <div className="max-w-md">
                         <div className="space-y-2 relative">
                            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400">
                                1. Find Registered Faculty
                            </label>
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-gray-400" />
                                <input
                                    type="text"
                                    value={facultySearch}
                                    onChange={e => setFacultySearch(e.target.value)}
                                    placeholder="Search by name or ID..."
                                    className="w-full bg-primary border border-accent rounded-md p-2 pl-10 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                    disabled={!!selectedFacultyForReset}
                                />
                            </div>
                            {facultySearchResults.length > 0 && facultySearch && (
                                <ul className="absolute z-10 w-full mt-1 bg-secondary border border-accent rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-600">
                                    {facultySearchResults.map(f => (
                                        <li key={f.empId} onClick={() => handleSelectFacultyForReset(f)} className="p-3 cursor-pointer hover:bg-accent dark:hover:bg-gray-700">
                                            <p className="font-semibold">{f.name} ({f.empId})</p>
                                            <p className="text-xs text-text-secondary dark:text-gray-400">{f.username}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {selectedFacultyForReset && (
                             <div className="space-y-4 mt-4 p-4 border border-accent dark:border-gray-700 rounded-lg">
                                <div>
                                    <h4 className="font-semibold text-text-primary dark:text-gray-200">2. Confirm Reset for {selectedFacultyForReset.name}</h4>
                                    <p className="text-sm text-text-secondary dark:text-gray-400">This will delete their login credentials and allow them to register again.</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setIsResetModalOpen(true)} className="w-auto flex justify-center items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700">
                                        <UserRoundX size={16}/> Reset Account
                                    </button>
                                     <button type="button" onClick={() => setSelectedFacultyForReset(null)} className="text-sm text-text-secondary hover:underline dark:text-gray-400">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'settings':
                return (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div>
                                <h4 className="font-semibold text-text-primary dark:text-gray-200">Enable Faculty Registration</h4>
                                <p className="text-sm text-text-secondary dark:text-gray-400">Allow new faculty members to create an account from the login page.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {(settingsLoading || isUpdatingSetting) && <Loader2 className="h-5 w-5 animate-spin text-highlight" />}
                                <ToggleSwitch
                                    enabled={settings.accountCreationEnabled}
                                    onToggle={handleToggleAccountCreation}
                                    disabled={settingsLoading || isUpdatingSetting}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-accent dark:border-gray-700/50">
                            <div>
                                <h4 className="font-semibold text-text-primary dark:text-gray-200">Enable User Account Requests</h4>
                                <p className="text-sm text-text-secondary dark:text-gray-400">Allow non-faculty users to request an account from the login page.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {(settingsLoading || isUpdatingSetting) && <Loader2 className="h-5 w-5 animate-spin text-highlight" />}
                                <ToggleSwitch
                                    enabled={settings.userAccountRequestEnabled}
                                    onToggle={handleToggleUserAccountRequest}
                                    disabled={settingsLoading || isUpdatingSetting}
                                />
                            </div>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <>
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="bg-secondary p-6 sm:p-8 rounded-lg shadow-xl dark:bg-gray-800">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                        <div>
                            <h2 className="text-2xl font-semibold text-highlight dark:text-teal-300 flex items-center gap-3">
                                <ShieldCheck size={28} /> User Account Management
                            </h2>
                            <p className="mt-1 text-text-secondary dark:text-gray-400">
                                {tabDescriptions[activeTab]}
                            </p>
                        </div>
                        <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors text-text-secondary hover:bg-accent hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 disabled:opacity-50">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                    
                    <nav className="w-full flex flex-wrap items-center gap-2 bg-primary dark:bg-gray-900/50 p-1 rounded-lg mb-6">
                        <TabButton tabName="approvals"><UserCheck size={16}/> Approvals</TabButton>
                        <TabButton tabName="password"><KeyRound size={16}/> Passwords</TabButton>
                        <TabButton tabName="facultyReset"><UserRoundX size={16}/> Faculty Reset</TabButton>
                        <TabButton tabName="settings"><Cog size={16}/> Settings</TabButton>
                    </nav>

                    <div className="border-t border-accent dark:border-gray-700 pt-6">
                        <h3 className="text-xl font-semibold text-text-primary dark:text-gray-200 mb-4">{tabTitles[activeTab]}</h3>

                        {feedback && (
                            <div className={`mb-4 p-4 rounded-md text-sm flex items-start gap-3 ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300'}`}>
                                {feedback.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5"/> : <AlertTriangle className="h-5 w-5 mt-0.5"/>}
                                {feedback.message}
                            </div>
                        )}
                        
                        {renderContent()}
                    </div>
                </div>
            </div>

            {isResetModalOpen && selectedFacultyForReset && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-secondary dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                            </div>
                            <div className="mt-0 text-center sm:text-left">
                            <h3 className="text-lg leading-6 font-medium text-text-primary dark:text-gray-100">
                                Reset Faculty Account
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-text-secondary dark:text-gray-400">
                                Are you sure you want to reset the account for <strong className="dark:text-gray-200">{selectedFacultyForReset.name}</strong>? This will remove their login and require them to register again. This action cannot be undone.
                                </p>
                            </div>
                            </div>
                        </div>
                        </div>
                        <div className="bg-accent dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                        <button
                            type="button"
                            disabled={isResetting}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 sm:ml-3 sm:w-auto sm:text-sm disabled:bg-gray-500"
                            onClick={handleConfirmReset}
                        >
                            {isResetting ? 'Resetting...' : 'Confirm Reset'}
                        </button>
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
                            onClick={() => setIsResetModalOpen(false)}
                        >
                            Cancel
                        </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserManagementPage;
