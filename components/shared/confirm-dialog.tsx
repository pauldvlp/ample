"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/components/providers/settings-provider";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = true,
  onConfirm,
  confirmPhrase,
  confirmPhraseLabel,
}: {
  trigger: React.ReactElement;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /** GitHub-style gate: require typing this exact phrase to enable confirm. */
  confirmPhrase?: string;
  confirmPhraseLabel?: string;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  const gated = !!confirmPhrase;
  const matches = !gated || typed.trim() === confirmPhrase!.trim();

  // reset the typed value whenever the dialog opens/closes — during render
  // (tracking the previous open state) rather than in an effect.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setTyped("");
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {gated && (
          <div className="space-y-1.5 text-left">
            <Label htmlFor="confirm-phrase" className="text-xs text-muted-foreground">
              {confirmPhraseLabel ??
                t("common.typeToConfirm", { phrase: confirmPhrase! })}
            </Label>
            <Input
              id="confirm-phrase"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmPhrase}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelLabel ?? t("action.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={loading || !matches}
            onClick={async (e) => {
              e.preventDefault();
              if (!matches) return;
              setLoading(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? t("action.working") : confirmLabel ?? t("action.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
