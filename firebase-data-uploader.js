// firebase-data-uploader.js
// Run this script once to upload your existing data to Firebase

import { database } from './firebase-server.js';
import { ref, set } from 'firebase/database';

// Your existing data from db.json
const initialData = {
  schedules: [
    {
      id: "A101",
      roomId: "A101",
      bookings: {
        "Monday-7:00": {
          courseName: "Math",
          section: "CpE 3-1",
          professorName: "Engr. Christian Caballero",
          startTime: "7:00",
          endTime: "8:00"
        },
        "Monday-9:00": {
          courseName: "Programming",
          section: "Cpe 3-1",
          professorName: "Engr. Derrick Ramos",
          startTime: "9:00",
          endTime: "11:00"
        }
      }
    }
  ]
};

// Function to upload data to Firebase
const uploadDataToFirebase = async () => {
  try {
    console.log('Uploading data to Firebase...');
    
    // Transform the array to object format for easier access in Firebase
    const transformedData = {};
    initialData.schedules.forEach(schedule => {
      transformedData[schedule.roomId] = {
        id: schedule.id,
        roomId: schedule.roomId,
        bookings: schedule.bookings
      };
    });

    // Upload to Firebase under 'schedules' path
    const schedulesRef = ref(database, 'schedules');
    await set(schedulesRef, transformedData);
    
    console.log('✅ Data uploaded successfully to Firebase!');
    console.log('You can now check your Firebase Realtime Database console');
    
  } catch (error) {
    console.error('❌ Error uploading data:', error);
  }
};

// Run the upload
uploadDataToFirebase();