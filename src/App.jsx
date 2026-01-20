import { useState } from 'react'
import Maze from './components/Maze'
import InfoPopup from './components/InfoPopup'
import "./styles/main.scss";

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Maze/>
      <InfoPopup />
    </>
  );
}

export default App
