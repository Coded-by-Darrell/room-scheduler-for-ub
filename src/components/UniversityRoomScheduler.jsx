// src/components/UniversityRoomScheduler.jsx
import React, { useState, useEffect } from 'react';
import { database } from '../firebase.js';
import { ref, get, set, remove, onValue } from 'firebase/database';
import UserManagement from './UserManagement';

const UniversityRoomScheduler = ({ user, onLogout }) => {
  // Check if user has editing permissions (only department heads)
  const canEdit = user.role === 'department_head';
  
  // State management
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [courseData, setCourseData] = useState({
    courseName: '',
    section: '',
    professorName: '',
    day: '',
    startTime: '',
    endTime: ''
  });
  const [schedule, setSchedule] = useState({});
  const [loading, setLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showCreateDeptHeadModal, setShowCreateDeptHeadModal] = useState(false);
  const [newDeptHead, setNewDeptHead] = useState({
    username: '',
    password: '',
    name: ''
  });
  const [createError, setCreateError] = useState('');

  // Building data
  const buildings = [
    { id: 'A', name: 'Building' },
    { id: 'D', name: 'Building' },
    { id: 'E', name: 'Building' },
    { id: 'F', name: 'Building' },
    { id: 'H', name: 'Building' },
    { id: 'I', name: 'Building' },
    { id: 'K', name: 'Building' },
  ];

  // Floors and rooms data
  const floors = [1, 2, 3, 4, 5];
  const rooms = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Time slots
  const timeSlots = [];
  for (let hour = 7; hour <= 20; hour++) {
    timeSlots.push(`${hour}:00`);
  }

  // Days of the week
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Handle creating new department head
  const handleCreateDeptHead = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCreateError('');

    try {
      // Get existing users from localStorage
      const storedUsers = localStorage.getItem('systemUsers');
      let users = storedUsers ? JSON.parse(storedUsers) : [];

      // Check if username already exists
      const existingUser = users.find(u => u.username === newDeptHead.username);
      if (existingUser) {
        setCreateError('Username already exists');
        setLoading(false);
        return;
      }

      // Create new department head
      const userToAdd = {
        id: Date.now(),
        username: newDeptHead.username,
        name: newDeptHead.name,
        role: 'department_head',
        createdAt: new Date().toISOString(),
        createdBy: user.username
      };

      // Add to users array
      users.push(userToAdd);
      localStorage.setItem('systemUsers', JSON.stringify(users));

      // Also update the mock users for login (this would be handled by your backend in production)
      const mockUsersKey = 'mockUsers';
      let mockUsers = {};
      try {
        const stored = localStorage.getItem(mockUsersKey);
        mockUsers = stored ? JSON.parse(stored) : {};
      } catch (e) {
        mockUsers = {};
      }

      mockUsers[newDeptHead.username] = {
        password: newDeptHead.password,
        role: 'department_head',
        name: newDeptHead.name
      };

      localStorage.setItem(mockUsersKey, JSON.stringify(mockUsers));

      // Reset form and close modal
      setNewDeptHead({ username: '', password: '', name: '' });
      setShowCreateDeptHeadModal(false);
      
      alert(`Department Head account created successfully for ${newDeptHead.name}!`);
      
    } catch (error) {
      setCreateError('Error creating department head account: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get all time slots a class occupies
  const getOccupiedTimeSlots = (startTime, endTime) => {
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    const slots = [];
    for (let hour = start; hour < end; hour++) {
      slots.push(`${hour}:00`);
    }
    return slots;
  };

  // Load schedules from Firebase
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const schedulesRef = ref(database, 'schedules');
      const snapshot = await get(schedulesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Transform Firebase data to the format our app expects
        const transformedSchedule = {};
        Object.keys(data).forEach(roomId => {
          transformedSchedule[roomId] = data[roomId].bookings || {};
        });
        setSchedule(transformedSchedule);
      } else {
        console.log('No schedule data found in Firebase');
        setSchedule({});
      }
    } catch (error) {
      console.error('Error loading schedules from Firebase:', error);
      alert('Error loading schedules: ' + error.message);
    }
    setLoading(false);
  };

  // Save schedule to Firebase
  const saveScheduleToFirebase = async (roomId, bookings) => {
    try {
      const roomRef = ref(database, `schedules/${roomId}`);
      await set(roomRef, {
        id: roomId,
        roomId: roomId,
        bookings: bookings
      });
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      throw error;
    }
  };

  // Delete room schedule from Firebase
  const deleteRoomFromFirebase = async (roomId) => {
    try {
      const roomRef = ref(database, `schedules/${roomId}`);
      await remove(roomRef);
    } catch (error) {
      console.error('Error deleting from Firebase:', error);
      throw error;
    }
  };

  // Save full schedule state to Firebase
  const saveSchedulesToFirebase = async (newSchedule) => {
    setLoading(true);
    try {
      const savePromises = Object.entries(newSchedule).map(([roomId, bookings]) => 
        saveScheduleToFirebase(roomId, bookings)
      );

      // Handle deleted rooms - get current data from Firebase and compare
      const schedulesRef = ref(database, 'schedules');
      const snapshot = await get(schedulesRef);
      
      if (snapshot.exists()) {
        const currentData = snapshot.val();
        const currentRoomIds = Object.keys(currentData);
        const newRoomIds = Object.keys(newSchedule);
        const roomsToDelete = currentRoomIds.filter(id => !newRoomIds.includes(id));
        
        const deletePromises = roomsToDelete.map(roomId => deleteRoomFromFirebase(roomId));
        
        await Promise.all([...savePromises, ...deletePromises]);
      } else {
        await Promise.all(savePromises);
      }

    } catch (error) {
      alert('Error saving schedules: ' + error.message);
    }
    setLoading(false);
  };

  // Set up real-time listener for Firebase data changes
  useEffect(() => {
    const schedulesRef = ref(database, 'schedules');
    
    const unsubscribe = onValue(schedulesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const transformedSchedule = {};
        Object.keys(data).forEach(roomId => {
          transformedSchedule[roomId] = data[roomId].bookings || {};
        });
        setSchedule(transformedSchedule);
      } else {
        setSchedule({});
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, []);

  // Check if a time slot is occupied by a class
  const isTimeSlotOccupied = (roomId, day, time) => {
    if (!schedule[roomId]) return null;
    for (const [timeSlot, classInfo] of Object.entries(schedule[roomId])) {
      const [classDay, classStartTime] = timeSlot.split('-');
      if (classDay === day) {
        const occupiedSlots = getOccupiedTimeSlots(classInfo.startTime, classInfo.endTime);
        if (occupiedSlots.includes(time)) {
          return { timeSlot, classInfo };
        }
      }
    }
    return null;
  };

  // Helper function to check if this is the first time slot of a class
  const isFirstTimeSlotOfClass = (roomId, day, time) => {
    const occupiedInfo = isTimeSlotOccupied(roomId, day, time);
    if (!occupiedInfo) return false;
    
    const { classInfo } = occupiedInfo;
    const startHour = parseInt(classInfo.startTime.split(':')[0]);
    const currentHour = parseInt(time.split(':')[0]);
    
    return startHour === currentHour;
  };

  // Helper function to get the row span for a class
  const getClassRowSpan = (classInfo) => {
    const startHour = parseInt(classInfo.startTime.split(':')[0]);
    const endHour = parseInt(classInfo.endTime.split(':')[0]);
    return endHour - startHour;
  };

  // Handle table cell click for editing (only for department heads)
  const handleCellClick = (day, time, roomId) => {
    if (!canEdit) return; // Prevent editing for non-department heads
    
    const occupiedInfo = isTimeSlotOccupied(roomId, day, time);
    if (occupiedInfo) {
      const { classInfo } = occupiedInfo;
      setCourseData({
        courseName: classInfo.courseName,
        section: classInfo.section,
        professorName: classInfo.professorName,
        day: day,
        startTime: classInfo.startTime,
        endTime: classInfo.endTime
      });
      setEditingSchedule({
        roomId,
        originalTimeSlot: occupiedInfo.timeSlot
      });
    }
  };

  // Handle cancel editing
  const handleCancelEditing = () => {
    setCourseData({
      courseName: '',
      section: '',
      professorName: '',
      day: '',
      startTime: '',
      endTime: ''
    });
    setEditingSchedule(null);
  };

  // Delete schedule (only for department heads)
  const handleDeleteSchedule = async () => {
    if (!canEdit || !editingSchedule) return;
    
    // Remove from local schedule
    const newSchedule = { ...schedule };
    if (newSchedule[editingSchedule.roomId]) {
      delete newSchedule[editingSchedule.roomId][editingSchedule.originalTimeSlot];
      // If no bookings remain for that room, remove room key
      if (Object.keys(newSchedule[editingSchedule.roomId]).length === 0) {
        delete newSchedule[editingSchedule.roomId];
      }
    }
    setSchedule(newSchedule);
    await saveSchedulesToFirebase(newSchedule);

    // Reset form and editing state
    handleCancelEditing();
    alert('Schedule deleted successfully!');
  };

  // Check for schedule conflicts
  const checkForConflicts = (roomId, day, startTime, endTime) => {
    if (!schedule[roomId]) return null;

    const newOccupiedSlots = getOccupiedTimeSlots(startTime, endTime);

    for (const [timeSlot, classInfo] of Object.entries(schedule[roomId])) {
      const [classDay, classStartTime] = timeSlot.split('-');
      if (classDay === day) {
        if (editingSchedule && timeSlot === editingSchedule.originalTimeSlot) {
          continue;
        }

        const existingOccupiedSlots = getOccupiedTimeSlots(classInfo.startTime, classInfo.endTime);
        const hasConflict = newOccupiedSlots.some(slot => existingOccupiedSlots.includes(slot));
        if (hasConflict) {
          return { timeSlot, classInfo };
        }
      }
    }
    return null;
  };

  // Proceed with scheduling after conflict resolution
  const proceedWithScheduling = async () => {
    const roomId = `${selectedBuilding}${selectedFloor}0${selectedRoom}`;
    const timeSlot = `${courseData.day}-${courseData.startTime}`;

    const newSchedule = { ...schedule };

    // If editing, remove old schedule
    if (editingSchedule) {
      if (newSchedule[editingSchedule.roomId]) {
        delete newSchedule[editingSchedule.roomId][editingSchedule.originalTimeSlot];
        if (Object.keys(newSchedule[editingSchedule.roomId]).length === 0) {
          delete newSchedule[editingSchedule.roomId];
        }
      }
    }

    // Add new schedule
    if (!newSchedule[roomId]) {
      newSchedule[roomId] = {};
    }
    newSchedule[roomId][timeSlot] = {
      courseName: courseData.courseName,
      endTime: courseData.endTime,
      professorName: courseData.professorName,
      section: courseData.section,
      startTime: courseData.startTime
    };

    setSchedule(newSchedule);
    await saveSchedulesToFirebase(newSchedule);

    // Reset form
    handleCancelEditing();

    alert(editingSchedule ? 'Schedule updated successfully!' : 'Room scheduled successfully!');
  };

  // Handle conflict resolution
  const handleConflictResolution = (replace) => {
    if (replace && conflictData) {
      // Remove conflicting schedule locally
      const { roomId, conflict } = conflictData;
      const newSchedule = { ...schedule };
      if (newSchedule[roomId]) {
        delete newSchedule[roomId][conflict.timeSlot];
        if (Object.keys(newSchedule[roomId]).length === 0) {
          delete newSchedule[roomId];
        }
      }
      setSchedule(newSchedule);
      saveSchedulesToFirebase(newSchedule).then(() => {
        proceedWithScheduling();
        
        // Close modal and redirect to home after replacing
        setShowConflictModal(false);
        setConflictData(null);
        setSelectedBuilding(null);
        setSelectedFloor(null);
        setSelectedRoom(null);
        
      }).catch(err => {
        alert('Error replacing existing schedule: ' + err.message);
        setShowConflictModal(false);
        setConflictData(null);
      });
    } else {
      setShowConflictModal(false);
      setConflictData(null);
    }
  };

  // Handle room scheduling (only for department heads)
  const handleScheduleRoom = async () => {
    if (!canEdit) return;
    
    if (!selectedBuilding || !selectedFloor || !selectedRoom ||
      !courseData.courseName || !courseData.section || !courseData.professorName ||
      !courseData.day || !courseData.startTime || !courseData.endTime) {
      alert('Please fill in all fields');
      return;
    }

    // Validate time range
    const startHour = parseInt(courseData.startTime.split(':')[0]);
    const endHour = parseInt(courseData.endTime.split(':')[0]);
    if (startHour >= endHour) {
      alert('End time must be after start time');
      return;
    }

    const roomId = `${selectedBuilding}${selectedFloor}0${selectedRoom}`;

    // Check for conflicts
    const conflict = checkForConflicts(roomId, courseData.day, courseData.startTime, courseData.endTime);

    if (conflict) {
      setConflictData({ roomId, conflict });
      setShowConflictModal(true);
      return;
    }

    // No conflicts, proceed with scheduling
    proceedWithScheduling();
  };

  // Handle building selection
  const handleBuildingSelect = (buildingId) => {
    setSelectedBuilding(buildingId);
    setSelectedFloor(null);
    setSelectedRoom(null);
    handleCancelEditing();
  };

  // Handle floor selection
  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedRoom(null);
    handleCancelEditing();
  };

  // Handle room selection
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    handleCancelEditing();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    if (!canEdit) return;
    
    const { name, value } = e.target;
    setCourseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate room ID to display
  const roomIdToDisplay = selectedBuilding && selectedFloor && selectedRoom
    ? `${selectedBuilding}${selectedFloor}0${selectedRoom}`
    : null;

  // Get role display text
  const getRoleDisplayText = (role) => {
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

  // Show User Management component if selected
  if (currentPage === 'user-management') {
    return <UserManagement user={user} onBack={() => setCurrentPage('home')} />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-red-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
          <div className="rounded-full w-20 h-20 bg-white flex items-center justify-center">
            <img src="/src/assets/UBlogo.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {/* Department Head Menu */}
          {canEdit && (
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCreateDeptHeadModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create Dept Head
              </button>
              <button
                onClick={() => setCurrentPage('user-management')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
                Manage Users
              </button>
            </div>
          )}
          
          {/* User Info */}
          <div className="text-right">
            <div className="text-white font-medium">{user.name}</div>
            <div className="text-red-200 text-sm">{getRoleDisplayText(user.role)}</div>
          </div>
          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* Create Department Head Modal */}
      {showCreateDeptHeadModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-900">Create Department Head Account</h3>
            {createError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateDeptHead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  value={newDeptHead.username}
                  onChange={(e) => setNewDeptHead({...newDeptHead, username: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={newDeptHead.name}
                  onChange={(e) => setNewDeptHead({...newDeptHead, name: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  required
                  value={newDeptHead.password}
                  onChange={(e) => setNewDeptHead({...newDeptHead, password: e.target.value})}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter password"
                />
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> The new department head will have full access to create schedules, manage users, and create other department head accounts.
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:bg-red-400"
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDeptHeadModal(false);
                    setCreateError('');
                    setNewDeptHead({ username: '', password: '', name: '' });
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

      {/* Access Level Notice for Non-Department Heads */}
      {!canEdit && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Read-Only Access:</strong> You can view all room schedules, but only Department Heads can add, edit, or delete schedules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Modal */}
      {showConflictModal && canEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-900">Room Already Occupied</h3>
            <p className="text-gray-700 mb-4">
              This room is already scheduled for this time slot with:
            </p>
            {conflictData && (
              <div className="bg-gray-100 p-3 rounded mb-4">
                <div className="font-semibold">{conflictData.conflict.classInfo.courseName}</div>
                <div className="text-sm text-gray-600">{conflictData.conflict.classInfo.section}</div>
                <div className="text-sm text-gray-600">{conflictData.conflict.classInfo.professorName}</div>
                <div className="text-sm text-gray-600">
                  {conflictData.conflict.classInfo.startTime} - {conflictData.conflict.classInfo.endTime}
                </div>
              </div>
            )}
            <p className="text-gray-700 mb-6">Do you want to replace the existing schedule?</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleConflictResolution(true)}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
              >
                Yes, Replace
              </button>
              <button
                onClick={() => handleConflictResolution(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
              >
                No, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4">
          <p className="font-bold">Loading...</p>
          <p>Processing schedule data...</p>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-grow p-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-red-900">University Room Scheduler</h1>
            <p className="text-gray-600">
              {canEdit ? 'Efficient room assignment for professors' : 'View room schedules and availability'}
            </p>
          </div>

          {/* Building Selection */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
              <h2 className="text-xl font-bold">Select Building</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {buildings.map(building => (
                <div
                  key={building.id}
                  className={`cursor-pointer p-4 rounded-lg border text-center transition-colors ${
                    selectedBuilding === building.id
                      ? 'bg-red-900 text-white'
                      : 'bg-white hover:bg-red-100'
                  }`}
                  onClick={() => handleBuildingSelect(building.id)}
                >
                  <div className="text-2xl font-bold mb-2">{building.id}</div>
                  <div className="text-sm">{building.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Floor and Room Selection */}
          {selectedBuilding && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Floor Selection */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-4">
                  <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                  <h2 className="text-xl font-bold">Select Floor</h2>
                </div>
                <div className="flex flex-wrap gap-4">
                  {floors.map(floor => (
                    <label key={floor} className="flex items-center">
                      <input
                        type="radio"
                        name="floor"
                        checked={selectedFloor === floor}
                        onChange={() => handleFloorSelect(floor)}
                        className="form-radio h-5 w-5 text-red-900"
                      />
                      <span className="ml-2">{floor}{floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Room Selection */}
              {selectedFloor && (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center mb-4">
                    <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                    </svg>
                    <h2 className="text-xl font-bold">Select Room</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {rooms.map(room => (
                      <label key={room} className="flex items-center">
                        <input
                          type="radio"
                          name="room"
                          checked={selectedRoom === room}
                          onChange={() => handleRoomSelect(room)}
                          className="form-radio h-5 w-5 text-red-900"
                        />
                        <span className="ml-2">Room {room}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Display and Form */}
          {selectedBuilding && selectedFloor && selectedRoom && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Weekly Schedule */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Weekly Schedule for Room {roomIdToDisplay}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border p-2 font-medium text-left bg-gray-50">Time</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="border p-2 font-medium text-left bg-gray-50">{day.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td className="border p-2 font-medium bg-gray-50">{time}</td>
                          {daysOfWeek.map(day => {
                            const roomId = `${selectedBuilding}${selectedFloor}0${selectedRoom}`;
                            const occupiedInfo = isTimeSlotOccupied(roomId, day, time);
                            const isFirstSlot = isFirstTimeSlotOfClass(roomId, day, time);

                            // If occupied but not the first slot, don't render a cell (it's part of the rowspan)
                            if (occupiedInfo && !isFirstSlot) {
                              return null;
                            }

                            return (
                              <td
                                key={`${day}-${time}`}
                                className={`border p-2 transition-colors ${
                                  canEdit 
                                    ? 'cursor-pointer hover:bg-gray-50' 
                                    : occupiedInfo 
                                      ? 'bg-blue-50' 
                                      : ''
                                }`}
                                onClick={() => handleCellClick(day, time, roomId)}
                                title={
                                  occupiedInfo 
                                    ? canEdit 
                                      ? "Click to edit this schedule" 
                                      : "Schedule occupied"
                                    : canEdit 
                                      ? "Click to add a schedule" 
                                      : ""
                                }
                                rowSpan={occupiedInfo ? getClassRowSpan(occupiedInfo.classInfo) : 1}
                              >
                                {occupiedInfo && (
                                  <div className="text-xs bg-blue-50 p-1 rounded">
                                    <div className="font-bold text-blue-900">{occupiedInfo.classInfo.courseName}</div>
                                    <div className="text-blue-700">{occupiedInfo.classInfo.section}</div>
                                    <div className="text-blue-600">{occupiedInfo.classInfo.professorName}</div>
                                    <div className="text-blue-500">{occupiedInfo.classInfo.startTime}-{occupiedInfo.classInfo.endTime}</div>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule Form - Only show for Department Heads */}
              {canEdit ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                      {editingSchedule ? 'Edit' : 'Schedule'} Room {roomIdToDisplay}
                    </h2>
                    {editingSchedule && (
                      <button
                        onClick={handleDeleteSchedule}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">Course Name:</label>
                      <input
                        type="text"
                        name="courseName"
                        value={courseData.courseName}
                        onChange={handleInputChange}
                        placeholder="e.g. Introduction to Programming"
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">Section:</label>
                      <input
                        type="text"
                        name="section"
                        value={courseData.section}
                        onChange={handleInputChange}
                        placeholder="e.g. CpE 3-1"
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">Professor Name:</label>
                      <input
                        type="text"
                        name="professorName"
                        value={courseData.professorName}
                        onChange={handleInputChange}
                        placeholder="e.g. Engr. Juan Dela Cruz"
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">Day of Week:</label>
                      <select
                        name="day"
                        value={courseData.day}
                        onChange={handleInputChange}
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select day</option>
                        {daysOfWeek.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">Start Time:</label>
                      <select
                        name="startTime"
                        value={courseData.startTime}
                        onChange={handleInputChange}
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Start time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-4 items-center">
                      <label className="text-sm font-medium text-gray-700 text-left">End Time:</label>
                      <select
                        name="endTime"
                        value={courseData.endTime}
                        onChange={handleInputChange}
                        className="col-span-3 p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">End time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleScheduleRoom}
                        disabled={loading}
                        className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${
                          loading
                            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Schedule Room'}
                      </button>
                      
                      {editingSchedule && (
                        <button
                          onClick={handleCancelEditing}
                          className="flex-1 bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                // Information panel for read-only users
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-bold mb-4">Room Information</h2>
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">Current Room: {roomIdToDisplay}</h3>
                      <p className="text-gray-600 text-sm">
                        Building {selectedBuilding}, Floor {selectedFloor}, Room {selectedRoom}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">Legend</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-blue-100 border mr-2"></div>
                          <span className="text-gray-700">Occupied time slot</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-white border mr-2"></div>
                          <span className="text-gray-700">Available time slot</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">Access Level</h3>
                      <p className="text-yellow-700 text-sm">
                        As a {getRoleDisplayText(user.role).toLowerCase()}, you have read-only access to view schedules. 
                        Contact your Department Head to make schedule changes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-red-900 text-white p-4 text-center">
        <p>University of Batangas &copy; 2025</p>
      </footer>
    </div>
  );
};

export default UniversityRoomScheduler;