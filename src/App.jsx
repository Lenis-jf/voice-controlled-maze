import { useState } from 'react'
import Maze from './components/Maze'
import "./styles/main.scss";

function App() {
  const [count, setCount] = useState(0)

  return <Maze/>;
}

export default App
