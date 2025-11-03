import React, { useEffect, useRef, useState, useCallback } from "react";
import "./styles/main.scss";

const Maze = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 600;

  }, []);

  return (
    <>
      <h2>Voice controlled Maze!</h2>
      <canvas ref={canvasRef}></canvas>
    </>
  );
};

export default Maze;