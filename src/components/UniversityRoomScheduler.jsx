import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001/schedules';

const UniversityRoomScheduler = () => {
  // State management
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
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
  const [user, setUser] = useState('Engr. Pablo Asi');
  const [loading, setLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);

  // Building data
  const buildings = [
    { id: 'A', name: 'Building' },
    { id: 'E', name: 'Building' },
    { id: 'F', name: 'Building' },
    { id: 'H', name: 'Building' },
    { id: 'I', name: 'Building' }
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
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

  // Transform API schedule array to object for easier use
  const transformApiScheduleToObject = (apiSchedules) => {
    const obj = {};
    apiSchedules.forEach(item => {
      obj[item.roomId] = item.bookings || {};
    });
    return obj;
  };

  // Transform schedule object to API format array
  const transformScheduleObjectToApi = (scheduleObj) => {
    const arr = [];
    for (const roomId in scheduleObj) {
      arr.push({
        id: roomId, // use roomId as id for JSON server
        roomId,
        bookings: scheduleObj[roomId]
      });
    }
    return arr;
  };

  // Load schedules from JSON server API
  const loadSchedules = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      const data = await response.json();
      const transformed = transformApiScheduleToObject(data);
      setSchedule(transformed);
    } catch (error) {
      alert('Error loading schedules: ' + error.message);
    }
    setLoading(false);
  };

  // Save full schedule state to JSON server API
  const saveSchedulesToApi = async (newSchedule) => {
    setLoading(true);
    try {
      // JSON server does not support batch updates, so update each room resource individually
      // We'll do PUT to /schedules/:id for each room to update bookings
      const updatePromises = Object.entries(newSchedule).map(async ([roomId, bookings]) => {
        // Check if the resource exists via GET:
        const resGet = await fetch(`${API_URL}/${roomId}`);
        if (resGet.ok) {
          // Resource exists, update via PUT
          const resPut = await fetch(`${API_URL}/${roomId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: roomId, roomId, bookings })
          });
          if (!resPut.ok) {
            throw new Error(`Failed to update schedule for room ${roomId}`);
          }
        } else {
          // Resource does not exist, create via POST
          const resPost = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: roomId, roomId, bookings })
          });
          if (!resPost.ok) {
            throw new Error(`Failed to create schedule for room ${roomId}`);
          }
        }
      });

      // Also check for rooms removed entirely (no bookings in newSchedule) and delete from server
      // First get current ids from server to compare
      const resCurrent = await fetch(API_URL);
      const currentRooms = await resCurrent.json();
      const currentIds = currentRooms.map(r => r.id);
      const newIds = Object.keys(newSchedule);
      const idsToDelete = currentIds.filter(id => !newIds.includes(id));

      const deletePromises = idsToDelete.map(async (id) => {
        const resDel = await fetch(`${API_URL}/${id}`, {
          method: 'DELETE'
        });
        if (!resDel.ok) {
          throw new Error(`Failed to delete schedule for room ${id}`);
        }
      });

      await Promise.all([...updatePromises, ...deletePromises]);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      alert('Error saving schedules: ' + error.message);
    }
  };

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

  // Handle table cell click for editing
  const handleCellClick = (day, time, roomId) => {
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

  // Delete schedule
  const handleDeleteSchedule = async () => {
    if (editingSchedule) {
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
      await saveSchedulesToApi(newSchedule);

      // Reset form and editing state
      handleCancelEditing();
      alert('Schedule deleted successfully!');
    }
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
      section: courseData.section,
      professorName: courseData.professorName,
      startTime: courseData.startTime,
      endTime: courseData.endTime
    };

    setSchedule(newSchedule);
    await saveSchedulesToApi(newSchedule);

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
      saveSchedulesToApi(newSchedule).then(() => {
        proceedWithScheduling();
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

  // Handle room scheduling
  const handleScheduleRoom = async () => {
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

  // Load schedules when component mounts
  useEffect(() => {
    loadSchedules();
  }, []);

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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-red-900 text-white p-4 flex justify-between items-center">
        <div className="flex items-center">
        <div className="rounded-full w-20 h-20 bg-white flex items-center justify-center">
            <img src="/src/assets/UBlogo.png" alt="Profile" className="w-full h-full object-cover rounded-full" />
        </div>

        </div>
        <div className="relative">
          <button className="bg-white text-black py-2 px-4 rounded flex items-center">
            {user}
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Conflict Modal */}
      {showConflictModal && (
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
            <p className="text-gray-600">Efficient room assignment for professors</p>
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
                                className="border p-2 cursor-pointer hover:bg-gray-50"
                                onClick={() => handleCellClick(day, time, roomId)}
                                title={occupiedInfo ? "Click to edit this schedule" : ""}
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

              
              {/* Schedule Form */}
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
                  <button
                    onClick={handleScheduleRoom}
                    disabled={loading}
                    className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                      loading
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Schedule Room'}
                  </button>
                </div>
              </div>
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

