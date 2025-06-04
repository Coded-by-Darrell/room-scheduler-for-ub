
import React, { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, get, set, remove } from 'firebase/database';

const UserManagement = ({ user, onBack }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'student'
  });
  const [error, setError] = useState('');

  // Load users from localStorage (in a real app, this would be from Firebase)
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // In the mock system, we'll store users in localStorage
    const storedUsers = localStorage.getItem('systemUsers');
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      // Initialize with default users
      const defaultUsers = [
        { id: 1, username: 'admin', name: 'Admin User', role: 'department_head', createdAt: new Date().toISOString() },
        { id: 2, username: 'dept.head', name: 'Engr. Pablo Asi', role: 'department_head', createdAt: new Date().toISOString() },
        { id: 3, username: 'faculty1', name: 'Prof. Juan Dela Cruz', role: 'faculty', createdAt: new Date().toISOString() },
        { id: 4, username: 'faculty2', name: 'Prof. Andres Bonifacio', role: 'faculty', createdAt: new Date().toISOString() },
        { id: 5, username: 'student1', name: 'Juan Dela Cruz', role: 'student', createdAt: new Date().toISOString() },
        { id: 6, username: 'student2', name: 'Maria Clara', role: 'student', createdAt: new Date().toISOString() },
      ];
      setUsers(defaultUsers);
      localStorage.setItem('systemUsers', JSON.stringify(defaultUsers));
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check if username already exists in systemUsers
      const existingUser = users.find(u => u.username === newUser.username);
      if (existingUser) {
        setError('Username already exists');
        setLoading(false);
        return;
      }

      // Also check in mockUsers to ensure no duplicates
      const storedMockUsers = localStorage.getItem('mockUsers');
      let mockUsers = storedMockUsers ? JSON.parse(storedMockUsers) : {};
      
      if (mockUsers[newUser.username]) {
        setError('Username already exists in login system');
        setLoading(false);
        return;
      }

      // Create user for systemUsers (user management)
      const userToAdd = {
        id: Date.now(),
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        createdAt: new Date().toISOString(),
        createdBy: user.username
      };

      // Update systemUsers
      const updatedUsers = [...users, userToAdd];
      setUsers(updatedUsers);
      localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));

      // Add to mockUsers for login functionality
      mockUsers[newUser.username] = {
        password: newUser.password,
        role: newUser.role,
        name: newUser.name
      };
      localStorage.setItem('mockUsers', JSON.stringify(mockUsers));

      // Reset form
      setNewUser({
        username: '',
        password: '',
        name: '',
        role: 'student'
      });
      setShowAddUser(false);

      alert(`User account created successfully!\n\nLogin credentials:\nUsername: ${newUser.username}\nPassword: ${newUser.password}\nRole: ${newUser.role}`);
      
    } catch (error) {
      setError('Error adding user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      // Find the user to get username
      const userToDelete = users.find(u => u.id === userId);
      
      if (userToDelete) {
        // Remove from systemUsers
        const updatedUsers = users.filter(u => u.id !== userId);
        setUsers(updatedUsers);
        localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));

        // Remove from mockUsers (login system)
        try {
          const storedMockUsers = localStorage.getItem('mockUsers');
          let mockUsers = storedMockUsers ? JSON.parse(storedMockUsers) : {};
          
          if (mockUsers[userToDelete.username]) {
            delete mockUsers[userToDelete.username];
            localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
          }
        } catch (error) {
          console.error('Error removing user from login system:', error);
        }

        alert(`User ${userToDelete.name} has been deleted successfully.`);
      }
    }
  };

  const handleRoleChange = (userId, newRole) => {
    // Find the user to get username
    const userToUpdate = users.find(u => u.id === userId);
    
    if (userToUpdate) {
      // Update systemUsers
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      );
      setUsers(updatedUsers);
      localStorage.setItem('systemUsers', JSON.stringify(updatedUsers));

      // Update mockUsers (login system)
      try {
        const storedMockUsers = localStorage.getItem('mockUsers');
        let mockUsers = storedMockUsers ? JSON.parse(storedMockUsers) : {};
        
        if (mockUsers[userToUpdate.username]) {
          mockUsers[userToUpdate.username].role = newRole;
          localStorage.setItem('mockUsers', JSON.stringify(mockUsers));
        }
      } catch (error) {
        console.error('Error updating user role in login system:', error);
      }

      alert(`${userToUpdate.name}'s role has been updated to ${getRoleDisplayName(newRole)}.`);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'department_head':
        return 'bg-red-100 text-red-800';
      case 'faculty':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'department_head':
        return 'Department Head';
      case 'faculty':
        return 'Faculty';
      case 'student':
        return 'Student';
      default:
        return role;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-red-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-red-800 rounded"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <div className="rounded-full w-12 h-12 bg-white flex items-center justify-center mr-4">
            <img src="/src/assets/UBlogo.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
          </div>
          <div>
            <h1 className="text-xl font-bold">User Management</h1>
            <p className="text-red-200 text-sm">Manage system users and permissions</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-white font-medium">{user.name}</div>
            <div className="text-red-200 text-sm">Department Head</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Add User Button */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">System Users</h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Add User
            </button>
          </div>

          {/* Add User Modal */}
          {showAddUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <h3 className="text-lg font-bold mb-4">Add New User</h3>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                  </div>
                )}
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <input
                      type="text"
                      required
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                      placeholder="Enter password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="department_head">Department Head</option>
                    </select>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> The user will be able to log in immediately with these credentials.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {loading ? 'Adding...' : 'Add User'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUser(false);
                        setError('');
                        setNewUser({ username: '', password: '', name: '', role: 'student' });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userData) => (
                  <tr key={userData.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                        <div className="text-sm text-gray-500">@{userData.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userData.role}
                        onChange={(e) => handleRoleChange(userData.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getRoleColor(userData.role)}`}
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                        <option value="department_head">Department Head</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userData.username !== user.username && (
                        <button
                          onClick={() => handleDeleteUser(userData.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Statistics */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Department Heads</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'department_head').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Faculty</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'faculty').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Students</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.role === 'student').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-red-900 text-white p-4 text-center">
        <p>University of Batangas &copy; 2025</p>
      </footer>
    </div>
  );
};

export default UserManagement;