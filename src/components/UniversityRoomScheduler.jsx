import React, { useState, useEffect } from 'react';

const UniversityRoomScheduler = () => {
  // State management
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [courseData, setCourseData] = useState({
    courseName: '',
    section: '',
    day: '',
    startTime: '',
    endTime: ''
  });
  const [schedule, setSchedule] = useState({});
  const [user, setUser] = useState('Engr. Pablo Asi');

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
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Handle building selection
  const handleBuildingSelect = (buildingId) => {
    setSelectedBuilding(buildingId);
    setSelectedFloor(null);
    setSelectedRoom(null);
  };

  // Handle floor selection
  const handleFloorSelect = (floor) => {
    setSelectedFloor(floor);
    setSelectedRoom(null);
  };

  // Handle room selection
  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCourseData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle room scheduling
  const handleScheduleRoom = () => {
    if (!selectedBuilding || !selectedFloor || !selectedRoom || 
        !courseData.courseName || !courseData.section || 
        !courseData.day || !courseData.startTime || !courseData.endTime) {
      alert('Please fill in all fields');
      return;
    }

    const roomId = `${selectedBuilding}${selectedFloor}0${selectedRoom}`;
    const timeSlot = `${courseData.day}-${courseData.startTime}`;
    
    // Create schedule entry
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (!newSchedule[roomId]) {
        newSchedule[roomId] = {};
      }
      newSchedule[roomId][timeSlot] = {
        courseName: courseData.courseName,
        section: courseData.section
      };
      return newSchedule;
    });

    // Reset form
    setCourseData({
      courseName: '',
      section: '',
      day: '',
      startTime: '',
      endTime: ''
    });
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
          <img src="/src/assets/UBlogo.png"  alt="University Logo" className="rounded-full w-10 h-10" />
        </div>
        <div className="relative">
          <button className="bg-white text-black py-2 px-4 rounded flex items-center">
            {user}
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </header>

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
              <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                  <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                    <svg className="w-6 h-6 mr-2 text-red-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                <h2 className="text-xl font-bold mb-4">Weekly Schedule</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 font-medium text-left">Time</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="border p-2 font-medium text-left">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timeSlots.map(time => (
                        <tr key={time}>
                          <td className="border p-2">{time}</td>
                          {daysOfWeek.map(day => {
                            const timeSlot = `${day}-${time}`;
                            const roomId = `${selectedBuilding}${selectedFloor}0${selectedRoom}`;
                            const classInfo = schedule[roomId] && schedule[roomId][timeSlot];
                            
                            return (
                              <td key={`${day}-${time}`} className="border p-2">
                                {classInfo && (
                                  <div className="text-xs">
                                    <div className="font-bold">{classInfo.courseName}</div>
                                    <div>{classInfo.section}</div>
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
                <h2 className="text-xl font-bold mb-4">Schedule Room {roomIdToDisplay}</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                    <input
                      type="text"
                      name="courseName"
                      value={courseData.courseName}
                      onChange={handleInputChange}
                      placeholder="e.g. Introduction to Computer Science"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <input
                      type="text"
                      name="section"
                      value={courseData.section}
                      onChange={handleInputChange}
                      placeholder="e.g. CS101-A"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                    <select
                      name="day"
                      value={courseData.day}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                    >
                      <option value="">Select day</option>
                      {daysOfWeek.map(day => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                      <select
                        name="startTime"
                        value={courseData.startTime}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">Start time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                      <select
                        name="endTime"
                        value={courseData.endTime}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                      >
                        <option value="">End time</option>
                        {timeSlots.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleScheduleRoom}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                  >
                    Schedule Room
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