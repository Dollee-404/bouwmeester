import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { File, FileText, Image, Download, Lock } from "lucide-react";
import { projectDetailService } from "../../../data/project-detail-service";
import type { ProjectFile } from "../../../data/detail-types";
import { ERPNEXT_URL } from "../../../bridge";

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return <FileText size={15} className="text-red-400 shrink-0" aria-hidden="true" />;
  }
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
    return <Image size={15} className="text-blue-400 shrink-0" aria-hidden="true" />;
  }
  return <File size={15} className="text-slate-400 shrink-0" aria-hidden="true" />;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

interface DocumentenTabProps {
  projectId: string;
}

export function DocumentenTab({ projectId }: DocumentenTabProps) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    projectDetailService
      .getProjectFiles(projectId)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[DocumentenTab] getProjectFiles mislukt:", err);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
        {t("documenten.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-sm text-red-500">
        {t("documenten.error")}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm font-medium text-slate-600">{t("documenten.empty_title")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("documenten.empty_body")}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 mb-3">{t("documenten.title")}</h3>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
        {files.map((file) => {
          const href = ERPNEXT_URL ? `${ERPNEXT_URL}${file.fileUrl}` : file.fileUrl;
          const size = formatFileSize(file.fileSize);
          const date = file.createdAt.toLocaleDateString("nl-NL");

          return (
            <li
              key={file.name}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors"
            >
              {getFileIcon(file.fileName)}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{file.fileName}</p>
                <p className="text-xs text-slate-400">
                  {size && `${size} · `}{date}
                </p>
              </div>

              {file.isPrivate && (
                <span
                  className="flex items-center gap-1 text-xs text-slate-400 shrink-0"
                  title={t("documenten.private")}
                >
                  <Lock size={11} aria-hidden="true" />
                  <span className="hidden sm:inline">{t("documenten.private")}</span>
                </span>
              )}

              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("documenten.download")} ${file.fileName}`}
                className="shrink-0 p-1.5 rounded text-slate-400 hover:text-y-teal hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-y-teal transition-colors"
              >
                <Download size={14} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
