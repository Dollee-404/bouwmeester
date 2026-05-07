import "./index.css";
import "./i18n/index";
import { SetupGate } from "./pages/SetupWizard";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TestPage } from "./dev/TestPage";
import { MockErrorProvider } from "./dev/mock-error-context";
import { ToastProvider } from "./components/ui/toast";

const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";

export default function App() {
  return (
    <ToastProvider>
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
  );
}
