import "./index.css";
import "./i18n/index";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SetupGate } from "./pages/SetupWizard";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TestPage } from "./dev/TestPage";
import { MockErrorProvider } from "./dev/mock-error-context";
import { ToastProvider } from "./components/ui/toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DemoBanner } from "./components/DemoBanner";

const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";

function LangSync() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <LangSync />
        <DemoBanner />
        <SetupGate>
          {DEV_MODE ? (
            <MockErrorProvider>
              <TestPage />
            </MockErrorProvider>
          ) : (
            <ProjectsPage />
          )}
        </SetupGate>
      </ToastProvider>
    </ErrorBoundary>
  );
}
