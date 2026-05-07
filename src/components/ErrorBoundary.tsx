import { Component, useState, type ReactNode, type ErrorInfo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

function ErrorFallback({ error }: { error: Error }) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-slate-50">
      <AlertTriangle size={48} className="text-slate-400 mb-4" />
      <h1 className="text-lg font-bold text-slate-800 mb-2">
        {t("errors.error_boundary_title")}
      </h1>
      <p className="text-sm text-slate-600 max-w-md mb-6">
        {t("errors.error_boundary_body")}
      </p>
      <div className="flex flex-col items-center gap-3">
        <Button variant="primary" onClick={() => window.location.reload()}>
          {t("errors.refresh_page")}
        </Button>
        <button
          className="text-xs text-slate-400 underline hover:text-slate-600 cursor-pointer"
          onClick={() => setShowDetails((v) => !v)}
        >
          {t("errors.show_technical_details")}
        </button>
        {showDetails && (
          <pre className="mt-2 text-left text-xs bg-white border border-slate-200 rounded-lg p-4 max-w-lg w-full overflow-auto text-slate-600 whitespace-pre-wrap">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ""}
          </pre>
        )}
      </div>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      "[Bouwmeester] Onverwachte fout gevangen door ErrorBoundary:",
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
