import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n/index";
import "./index.css";
import App from "./App.tsx";
import { LANG } from "./bridge";

document.documentElement.lang = LANG;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
