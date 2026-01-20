import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';
import useSound from 'use-sound';

import inputErrorSound from "../../public/assets/sounds/input-error-sound.mp3";
import uiElementSelectionSound from "../../public/assets/sounds/ui-selection-sound.mp3";

const Menu = ({ isOpen, onClose, initialTime, onSetInitialTime, gridSize, onSetGridSize, onMenuStateChange }) => {
    const mainBurgerContainerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [localTimerSeconds, setLocalTimerSeconds] = useState(Math.floor((initialTime || 60000) / 1000));
    const [localCols, setLocalCols] = useState(gridSize?.cols || 15);
    const [localRows, setLocalRows] = useState(gridSize?.rows || 10);
    const [selectedDifficulty, setSelectedDifficulty] = useState(null);
    const [alertMsg, setAlertMsg] = useState(null);

    const [playInputError] = useSound(inputErrorSound);
    const [playElementSelected] = useSound(uiElementSelectionSound);

    const { t, i18n } = useTranslation();

    useEffect(() => {
        playElementSelected();
        onMenuStateChange?.(menuOpen);
    }, [menuOpen]);

    useEffect(() => {
        if (alertMsg) {
            const timer = setTimeout(() => setAlertMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [alertMsg]);

    const handleInputChange = (value, min, max, setter) => {
        if (value === "") {
            setter("");
            return;
        }
        const num = Number(value);
        if (num > max) {
            playInputError();
            setAlertMsg(t('alert_max', { max }));
            setter(max);
        } else {
            setter(value);
        }
    };

    const handleInputBlur = (value, min, setter) => {
        if (value === "" || Number(value) < min) {
            playInputError();
            setAlertMsg(t('alert_min', { min }));
            setter(min);
        }
    };

    const toggleMenu = () => {
        // playElementSelected();
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
        switch (level) {
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
                seconds = 300;
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
            playElementSelected();
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
                    {alertMsg && <div className="custom-alert">{alertMsg}</div>}
                    <h4>{t("Dificulty")}</h4>
                    <div className="dificulty-levels">
                        <span className={`easy-mode ${selectedDifficulty === 'easy' ? 'selected' : ''}`} onClick={() => { playElementSelected(); handleDifficulty('easy'); }}>{t("Easy")}</span>
                        <span className={`medium-mode ${selectedDifficulty === 'medium' ? 'selected' : ''}`} onClick={() => { playElementSelected(); handleDifficulty('medium'); }}>{t("Medium")}</span>
                        <span className={`hard-mode ${selectedDifficulty === 'hard' ? 'selected' : ''}`} onClick={() => { playElementSelected(); handleDifficulty('hard'); }}>{t("Hard")}</span>
                    </div>
                    <h4>{t("Customize Timer")}</h4>
                    <div className="customize-timer">
                        <label>
                            {t("Seconds")}
                            <input
                                type="number"
                                min="5"
                                max="1800"
                                value={localTimerSeconds}
                                onChange={(e) => handleInputChange(e.target.value, 5, 1800, setLocalTimerSeconds)}
                                onBlur={(e) => handleInputBlur(e.target.value, 5, setLocalTimerSeconds)}
                                onKeyDown={(e) => handleKeyDown(e, applyTimer)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </label>
                        <button className="action-button" onClick={(e) => { e.stopPropagation(); playElementSelected(); applyTimer(); }}>
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
                                    onChange={(e) => handleInputChange(e.target.value, 3, 30, setLocalCols)}
                                    onBlur={(e) => handleInputBlur(e.target.value, 3, setLocalCols)}
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
                                    onChange={(e) => handleInputChange(e.target.value, 3, 30, setLocalRows)}
                                    onBlur={(e) => handleInputBlur(e.target.value, 3, setLocalRows)}
                                    onKeyDown={(e) => handleKeyDown(e, applyGridSize)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </label>
                        </div>
                        <button className="action-button" onClick={(e) => { e.stopPropagation(); playElementSelected(); applyGridSize(); }}>
                            {t("Apply")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Menu;