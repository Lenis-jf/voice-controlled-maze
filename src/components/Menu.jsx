import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

const Menu = ({ isOpen, onClose, initialTime, onSetInitialTime, gridSize, onSetGridSize }) => {
    const mainBurgerContainerRef = useRef(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [localTimerSeconds, setLocalTimerSeconds] = useState(Math.floor((initialTime || 60000) / 1000));
    const [localCols, setLocalCols] = useState(gridSize?.cols || 15);
    const [localRows, setLocalRows] = useState(gridSize?.rows || 10);

    const { t, i18n } = useTranslation();

    const toggleMenu = () => {
        console.log("Toggling menu");
        console.log("Menu is currently:", menuOpen ? "Open" : "Closed");

        setMenuOpen(prev => !prev);
    }

    const applyTimer = () => {
        const secs = isNaN(localTimerSeconds) ? 60 : Math.max(5, Math.min(3600, Number(localTimerSeconds)));
        onSetInitialTime?.(secs * 1000);
    };

    const applyGridSize = () => {
        const cols = isNaN(localCols) ? gridSize?.cols || 15 : Number(localCols);
        const rows = isNaN(localRows) ? gridSize?.rows || 10 : Number(localRows);
        onSetGridSize?.({ cols, rows });
    };

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

    return (
        <div className={menuOpen ? "menu open" : "menu closed"} ref={mainBurgerContainerRef} onClick={toggleMenu}>
            <div className="burger-container">
                <div className="burger-line"></div>
                <div className="burger-line middle-line"></div>
                <div className="burger-line"></div>
            </div>

            {menuOpen && (
                <div className="menu-content">
                    <h4>{t("Dificulty")}</h4>
                    <div className="dificulty-levels">
                        <span className="easy-mode">{t("Easy")}</span>
                        <span className="medium-mode">{t("Medium")}</span>
                        <span className="hard-mode">{t("Hard")}</span>
                    </div>
                    <h4>{t("Customize Timer")}</h4>
                    <div className="customize-timer">
                        <label>
                            {t("Seconds")}
                            <input
                                type="number"
                                min="20"
                                max="300"
                                value={localTimerSeconds}
                                onChange={(e) => setLocalTimerSeconds(e.target.value)}
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
                                    min="5"
                                    max="100"
                                    value={localCols}
                                    onChange={(e) => setLocalCols(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </label>
                            <label>
                                {t("Rows")}
                                <input
                                    type="number"
                                    min="5"
                                    max="40"
                                    value={localRows}
                                    onChange={(e) => setLocalRows(e.target.value)}
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