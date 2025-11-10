import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from '../locales/en/translation.json';
import translationES from '../locales/es/translation.json';
import translationDE from '../locales/de/translation.json';

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources: {
      en: {
        translation: translationEN,
      },
      es: {
        translation: translationES,
      },
      de: {
        translation: translationDE,
      },
    },
    fallbackLng: 'de', // Idioma de respaldo
    interpolation: {
      escapeValue: false, // React ya maneja el escape
    },
  });

export default i18n;