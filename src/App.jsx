import { useState } from 'react'
import './App.css'
import UniversityRoomScheduler from './components/UniversityRoomScheduler';


function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <UniversityRoomScheduler />
    </div>
  )
}

export default App
