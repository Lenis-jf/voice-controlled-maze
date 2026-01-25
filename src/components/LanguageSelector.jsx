import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import useSound from 'use-sound';
import uiElementSelectionSound from "../../public/assets/sounds/ui-selection-sound.mp3";

const languageOptions = (t) => [
    { code: 'es', label: t('lang.es'), flag: '🇪🇸' },
    { code: 'en', label: t('lang.en'), flag: '🇬🇧' },
    { code: 'de', label: t('lang.de'), flag: '🇩🇪' },
];

const LanguageSelector = ({ currentLanguage, onLanguageChange }) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const languages = languageOptions(t);

    const currentLanguageCode = i18n.language.split('-')[0];
    const activeLang = languages.find(lang => lang.code === currentLanguageCode) || languages[0];

    const toggleDropdown = () => {
        playElementSelected();
        setIsOpen(!isOpen);
    }; 
    const [playElementSelected] = useSound(uiElementSelectionSound, { volume: 1.0 });

    const handleSelect = (langCode) => {
        i18n.changeLanguage(langCode);

        if (onLanguageChange) {
            onLanguageChange(langCode);
        }
        playElementSelected();
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                // console.log("Clicked outside");
                playElementSelected();
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, playElementSelected]);

    return (
        <div className="language-selector-container" ref={dropdownRef}>
            <button
                className={`lang-glass-button ${isOpen ? 'open' : ''}`}
                onClick={toggleDropdown}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Select Language"
            >
                <span className="lang-flag" role="img" aria-label={activeLang.label} >{activeLang.flag}</span>
                <span className="lang-text">{activeLang.code.toUpperCase()}</span>
                <svg className="lang-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>

            <ul
                className={`lang-glass-dropdown ${isOpen ? 'visible' : ''}`}
                role="listbox"
            >
                {languages.map((lang) => (
                    <li
                        key={lang.code}
                        className={`lang-option ${currentLanguageCode === lang.code ? 'active' : ''}`}
                        onClick={() => handleSelect(lang.code)}
                        role="option"
                        aria-selected={currentLanguageCode === lang.code}
                        tabIndex={0}
                        onKeyPress={(e) => { if (e.key === 'Enter') handleSelect(lang.code) }}
                    >
                        <span className="lang-flag" role="img" aria-label={lang.label}>{lang.flag}</span>
                        <span className="lang-label">{lang.label}</span>
                        {currentLanguage === lang.code && <span className="lang-check">✓</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LanguageSelector;