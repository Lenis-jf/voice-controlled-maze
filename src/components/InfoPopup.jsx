import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useSound from 'use-sound';
import uiElementSelectionSound from "../../public/assets/sounds/ui-selection-sound.mp3";
import LanguageSelector from './LanguageSelector';

const baseUrl = import.meta.env.VITE_PUBLIC_URL || "";

const InfoPopup = () => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(() => {
        return !localStorage.getItem('hasSeenInfoPopup');
    });
    const [isClosing, setIsClosing] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [playElementSelected] = useSound(uiElementSelectionSound, { volume: 1.0 });

    const handleOpen = () => {
        playElementSelected();
        setIsOpen(true);
        setIsClosing(false);
    };

    const handleClose = () => {
        playElementSelected();
        setIsClosing(true);
        
        if (dontShowAgain) {
            localStorage.setItem('hasSeenInfoPopup', 'true');
        } else {
            localStorage.removeItem('hasSeenInfoPopup');
        }

        setTimeout(() => {
            setIsOpen(false);
            setIsClosing(false);
        }, 280);
    };

    const handleLanguageChange = (langCode) => {
        i18n.changeLanguage(langCode);
    };

    const toggleDontShow = () => {
        setDontShowAgain(prev => !prev);
    };

    return (
        <>
            <button className="info-trigger-btn" onClick={handleOpen} aria-label={t('info_popup_title')}>
                <img src={`${baseUrl}assets/icons/info.svg`} alt="Info" />
            </button>

            {isOpen && (
                <div
                    className={`info-popup-overlay ${isClosing ? 'closing' : ''}`}
                    onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
                >
                    <div className="popup-lang-selector-wrapper">
                        <LanguageSelector
                            onLanguageChange={handleLanguageChange}
                        />
                    </div>
                    <div className={`info-popup-content liquid-glass ${isClosing ? 'closing' : ''}`}>

                        <button className="close-btn" onClick={handleClose}>
                            <img src={`${baseUrl}assets/icons/close.svg`} alt="Close" />
                        </button>

                        <div className="popup-header-stacked">
                            <h2>{t('info_popup_title')}</h2>
                        </div>
                        <div className="scrollable-content">
                            <div className="info-section sound-warning">
                                <p>🔊 {t('info_sound_required')}</p>
                            </div>

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
                        </div>

                        <div className="popup-footer-controls">
                            <label className="dont-show-checkbox">
                                <input 
                                    type="checkbox" 
                                    checked={dontShowAgain} 
                                    onChange={toggleDontShow} 
                                />
                                <span>{t('info_dont_show_again')}</span>
                            </label>

                            <button className="action-btn" onClick={handleClose}>
                                {t('info_close')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InfoPopup;
