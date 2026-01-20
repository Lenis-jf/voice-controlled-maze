import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useSound from 'use-sound';
import uiElementSelectionSound from "../../public/assets/sounds/ui-selection-sound.mp3";

const baseUrl = import.meta.env.VITE_PUBLIC_URL || "";

const InfoPopup = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [playElementSelected] = useSound(uiElementSelectionSound, { volume: 1.0 });

    /* 
       User requested the popup to show on every reload/session start regardless of previous history.
       Removed localStorage check to ensure it defaults to open.
    */

    const handleOpen = () => {
        playElementSelected();
        setIsOpen(true);
        setIsClosing(false);
    };

    const handleClose = () => {
        playElementSelected();
        setIsClosing(true);
        // Wait for animation to finish (0.3s)
        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 280); 
    };

    return (
        <>
            <button className="info-trigger-btn" onClick={handleOpen} aria-label={t('info_popup_title')}>
                <img src={`${baseUrl}assets/icons/info.svg`} alt="Info" />
            </button>

            {isOpen && (
                <div 
                    className={`info-popup-overlay ${isClosing ? 'closing' : ''}`} 
                    onClick={(e) => { if(e.target === e.currentTarget) handleClose() }}
                >
                    <div className={`info-popup-content liquid-glass ${isClosing ? 'closing' : ''}`}>
                        <button className="close-btn" onClick={handleClose}>
                             <img src={`${baseUrl}assets/icons/close.svg`} alt="Close" />
                        </button>
                        
                        <h2>{t('info_popup_title')}</h2>
                        
                        <div className="info-section">
                            <p>{t('info_how_to_play')}</p>
                        </div>

                         <div className="info-section">
                            <p>{t('info_maze_options')}</p>
                        </div>

                        <div className="info-section">
                            <p>{t('info_languages')}</p>
                        </div>

                        <div className="info-section">
                            <p>{t('info_controls')}</p>
                            <p>{t('info_voice_commands_detail')}</p>
                        </div>

                        <div className="gifs-container">
                            <div className="gif-wrapper">
                                <img src={`${baseUrl}assets/gif/keyboard-wasd.gif`} alt="Keyboard Controls" />
                            </div>
                            <div className="gif-wrapper">
                                <img src={`${baseUrl}assets/gif/voice-commands.gif`} alt="Voice Commands" />
                            </div>
                        </div>

                        <button className="action-btn" onClick={handleClose}>
                            {t('info_close')}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default InfoPopup;
