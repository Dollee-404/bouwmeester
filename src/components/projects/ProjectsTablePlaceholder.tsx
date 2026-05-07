import { Table2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../ui/empty-state";
import { Button } from "../ui/button";

interface ProjectsTablePlaceholderProps {
  onBack: () => void;
}

export function ProjectsTablePlaceholder({ onBack }: ProjectsTablePlaceholderProps) {
  const { t } = useTranslation();
  return (
    <div className="p-8">
      <EmptyState
        icon={<Table2 size={32} />}
        title={t("projects.table_coming_soon_title")}
        description={t("projects.table_coming_soon_body")}
        action={
          <Button variant="secondary" size="sm" onClick={onBack}>
            {t("projects.back_to_board")}
          </Button>
        }
      />
    </div>
  );
}
