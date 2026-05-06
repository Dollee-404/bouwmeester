import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import nl from "./nl.json";
import en from "./en.json";
import { LANG } from "../bridge";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: { translation: nl },
      en: { translation: en },
    },
    lng: LANG,
    fallbackLng: "nl",
    interpolation: { escapeValue: false },
    detection: { order: ["querystring"], lookupQuerystring: "lang" },
  });

export default i18n;
