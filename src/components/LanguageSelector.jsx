import React, { useState, useRef, useEffect } from 'react';

const languages = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];

const LanguageSelector = ({ currentLanguage, onLanguageChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const activeLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

    const toggleDropdown = () => setIsOpen(!isOpen);

    const handleSelect = (langCode) => {
        if (onLanguageChange) {
            onLanguageChange(langCode);
        }
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                        className={`lang-option ${currentLanguage === lang.code ? 'active' : ''}`}
                        onClick={() => handleSelect(lang.code)}
                        role="option"
                        aria-selected={currentLanguage === lang.code}
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