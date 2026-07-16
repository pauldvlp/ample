"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/shared/section-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { resetAllData } from "@/lib/actions/data";
import { useT } from "@/components/providers/settings-provider";

export function DataManagement() {
  const t = useT();
  const router = useRouter();

  async function handleReset() {
    const res = await resetAllData();
    if (res.ok) {
      toast.success(t("settings.data.resetToast"));
      router.refresh();
    } else {
      toast.error(res.error || t("settings.data.resetError"));
    }
  }

  return (
    <SectionCard
      title={t("settings.data.title")}
      description={t("settings.data.description")}
    >
      <div className="space-y-3">
        {/* Export */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {t("settings.data.exportTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.data.exportDescription")}
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            nativeButton={false}
            render={
              <a
                href="/api/export"
                download="ample-transactions.csv"
                aria-label={t("settings.data.exportAria")}
              />
            }
          >
            <Download className="size-4" />
            {t("settings.data.exportButton")}
          </Button>
        </div>

        {/* Reset — permanently wipes all financial data (phrase-gated) */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-negative/30 bg-negative/5 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">
              {t("settings.data.resetTitle")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("settings.data.resetDescription")}
            </p>
          </div>
          <ConfirmDialog
            title={t("settings.data.resetTitle")}
            description={t("settings.data.resetConfirmBody")}
            confirmLabel={t("settings.data.resetConfirmLabel")}
            confirmPhrase={t("settings.data.resetPhrase")}
            onConfirm={handleReset}
            trigger={
              <Button variant="destructive" className="shrink-0">
                <Trash2 className="size-4" />
                {t("settings.data.resetButton")}
              </Button>
            }
          />
        </div>
      </div>
    </SectionCard>
  );
}
