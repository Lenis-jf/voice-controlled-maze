import React, { useState, useEffect, use } from "react";

export const formatTime = (time) => {
	const seconds = String(Math.floor((time / 1000) % 60)).padStart(2, '0');
	const minutes = String(Math.floor((time / (1000 * 60)) % 60)).padStart(2, '0');

	return { minutes, seconds };
}

const Timer = ({ isRunning, setIsRunning, isGenerated, time, setTime, onTimeUp, gameStatus }) => {
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!isReady) return;
		if (!isRunning) return;

		const interval = setInterval(() => {
			setTime((prevTime) => (prevTime > 0 ? prevTime - 1000 : 0));
		}, 1000);

		return () => clearInterval(interval);
	}, [isRunning]);

	useEffect(() => {
		if (time === 0) {
			setIsRunning(false);

			if (onTimeUp) {
				console.log("Time's up!");
				onTimeUp();
			}
		}
	}, [time]);

	useEffect(() => {
		if (isGenerated) {
			reset();
			setIsReady(true);
		}
	}, [isGenerated]);

	function reset() {
    setTime(60000);
    setIsRunning(false);
	}

	return (
		<div className="timer">
			{formatTime(time).minutes}:{formatTime(time).seconds}
		</div>
	);
};

export default Timer;