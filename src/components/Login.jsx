
import React, { useState, useEffect } from 'react';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    role: 'student' // Default role
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mockUsers, setMockUsers] = useState({});

  // Load users when component mounts
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    // Default hardcoded users
    const defaultUsers = {
      // Department Heads
      'dept.head': { password: 'depthead123', role: 'department_head', name: 'ENGR. Pablo Asi' },
      'admin': { password: 'admin123', role: 'department_head', name: 'Admin User' },
      
      // Students
      'student1': { password: 'student123', role: 'student', name: 'Darrell C. Ocampo' },
      'student2': { password: 'student123', role: 'student', name: 'Maria Clara' },
      
      // Faculty
      'faculty1': { password: 'faculty123', role: 'faculty', name: 'ENGR. Derrick Ramos' },
      'faculty2': { password: 'faculty123', role: 'faculty', name: 'Prof. Andres Bonifacio' },
    };

    // Load additional users from localStorage
    try {
      const storedMockUsers = localStorage.getItem('mockUsers');
      const additionalUsers = storedMockUsers ? JSON.parse(storedMockUsers) : {};
      
      // Merge default users with stored users
      const allUsers = { ...defaultUsers, ...additionalUsers };
      setMockUsers(allUsers);
    } catch (error) {
      console.error('Error loading users from localStorage:', error);
      setMockUsers(defaultUsers);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      const user = mockUsers[credentials.username];
      
      if (!user || user.password !== credentials.password) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      // Successful login
      const userData = {
        username: credentials.username,
        name: user.name,
        role: user.role
      };

      localStorage.setItem('user', JSON.stringify(userData));
      onLogin(userData);
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Login Content */}
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-white rounded-full flex items-center justify-center mb-4">
            <img src="/src/assets/UBlogo.png" alt="UB Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <h2 className="text-3xl font-bold text-red-900">University Room Scheduler</h2>
          <p className="mt-2 text-sm text-black">Sign in to access the room scheduling system</p>
        </div>

        {/* Login Form with minimalist shadow */}
        <form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                I am a
              </label>
              <select
                id="role"
                name="role"
                value={credentials.role}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="department_head">Department Head</option>
              </select>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading 
                  ? 'bg-red-400 cursor-not-allowed' 
                  : 'bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
              } transition duration-150 ease-in-out`}
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"></path>
                </svg>
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          
        </form>
      </div>
    </div>
  );
};

export default Login;