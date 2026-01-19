import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

const Menu = ({ isOpen, onClose, initialTime, onSetInitialTime, gridSize, onSetGridSize }) => {
    const mainBurgerContainerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [localTimerSeconds, setLocalTimerSeconds] = useState(Math.floor((initialTime || 60000) / 1000));
    const [localCols, setLocalCols] = useState(gridSize?.cols || 15);
    const [localRows, setLocalRows] = useState(gridSize?.rows || 10);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);

    const { t, i18n } = useTranslation();

    const toggleMenu = () => {
        console.log("Toggling menu");
        console.log("Menu is currently:", menuOpen ? "Open" : "Closed");

        setMenuOpen(prev => !prev);
    }

    const applyTimer = () => {
        const secs = isNaN(localTimerSeconds) ? 60 : Math.max(5, Math.min(1800, Number(localTimerSeconds)));
        onSetInitialTime?.(secs * 1000);
        setSelectedDifficulty(null);
    };

    const applyGridSize = () => {
        let cols = isNaN(localCols) ? gridSize?.cols || 15 : Number(localCols);
        let rows = isNaN(localRows) ? gridSize?.rows || 10 : Number(localRows);

        cols = Math.max(3, Math.min(30, cols));
        rows = Math.max(3, Math.min(30, rows));

        onSetGridSize?.({ cols, rows });
        setSelectedDifficulty(null);
    };

    const handleDifficulty = (level) => {
        let cols, rows, seconds;
        switch(level) {
            case 'easy':
                cols = 8;
                rows = 5;
                seconds = 60;
                break;
            case 'medium':
                cols = 15;
                rows = 10;
                seconds = 120;
                break;
            case 'hard':
                cols = 15;
                rows = 15;
                seconds = 120;
                break;
            default:
                return;
        }

        setSelectedDifficulty(level);
        setLocalCols(cols);
        setLocalRows(rows);
        setLocalTimerSeconds(seconds);
        
        onSetInitialTime?.(seconds * 1000);
        onSetGridSize?.({ cols, rows });
    }

    useEffect(() => {
        const closeMenu = (e) => {
            if (mainBurgerContainerRef.current && !mainBurgerContainerRef.current.contains(e.target)) {
                if (menuOpen) {
                    console.log("Click outside menu detected, closing menu.");
                    setMenuOpen(false);
                }
            }
        }

        document.addEventListener("click", closeMenu);

        return () => {
            document.removeEventListener("click", closeMenu);
        };
    }, [menuOpen]);

    const handleKeyDown = (e, callback) => {
        if (e.key === 'Enter') {
            callback();
        }
    }

    return (
        <div className={menuOpen ? "menu open" : "menu closed"} ref={mainBurgerContainerRef}>
            <div className="burger-container" onClick={toggleMenu}>
                <div className="burger-line"></div>
                <div className="burger-line middle-line"></div>
                <div className="burger-line"></div>
            </div>

            {menuOpen && (
                <div className="menu-content">
                    <h4>{t("Dificulty")}</h4>
                    <div className="dificulty-levels">
                        <span className={`easy-mode ${selectedDifficulty === 'easy' ? 'selected' : ''}`} onClick={() => handleDifficulty('easy')}>{t("Easy")}</span>
                        <span className={`medium-mode ${selectedDifficulty === 'medium' ? 'selected' : ''}`} onClick={() => handleDifficulty('medium')}>{t("Medium")}</span>
                        <span className={`hard-mode ${selectedDifficulty === 'hard' ? 'selected' : ''}`} onClick={() => handleDifficulty('hard')}>{t("Hard")}</span>
                    </div>
                    <h4>{t("Customize Timer")}</h4>
                    <div className="customize-timer">
                        <label>
                            {t("Seconds")}
                            <input
                                type="number"
                                min="10"
                                max="1800"
                                value={localTimerSeconds}
                                onChange={(e) => setLocalTimerSeconds(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, applyTimer)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </label>
                        <button className="action-button" onClick={(e) => { e.stopPropagation(); applyTimer(); }}>
                            {t("Apply")}
                        </button>
                    </div>
                    <h4>{t("Maze Size")}</h4>
                    <div className="customize-maze-size">
                        <div className="size-labels">
                            <label>
                                {t("Columns")}
                                <input
                                    type="number"
                                    min="3"
                                    max="30"
                                    value={localCols}
                                    onChange={(e) => setLocalCols(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, applyGridSize)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </label>
                            <label>
                                {t("Rows")}
                                <input
                                    type="number"
                                    min="3"
                                    max="30"
                                    value={localRows}
                                    onChange={(e) => setLocalRows(e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, applyGridSize)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </label>
                        </div>
                        <button className="action-button" onClick={(e) => { e.stopPropagation(); applyGridSize(); }}>
                            {t("Apply")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;