import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import itTranslation from './locales/it/translation.json';

const resources = {
  en: {
    translation: enTranslation,
  },
  it: {
    translation: itTranslation,
  },
};

const savedLanguage = localStorage.getItem('language');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage || 'en',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
  });

// Save language to localStorage whenever it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
});

export default i18n;
