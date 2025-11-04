import { useState } from 'react'
import Maze from './Maze.jsx'
import "./styles/main.scss";

function App() {
  const [count, setCount] = useState(0)

  return <Maze/>;
}

export default App
