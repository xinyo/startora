import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { iconAssets } from "@/assets/registry";
import { Button } from "@/components/base/buttons/button";
import { ApiClientError } from "@/lib/api";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

interface AppEditorDialogProps {
  appItem: AppItem | null;
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
}

function errorMessage(
  error: unknown,
  field: "name" | "icon" | "url",
  t: (key: string) => string,
): string | null {
  if (!(error instanceof ApiClientError) || !error.fields?.[field]) {
    return null;
  }
  return t(`appForm.${field}Invalid`);
}

export function AppEditorDialog({
  appItem,
  isOpen,
  onOpenChange,
}: AppEditorDialogProps) {
  const { t } = useTranslation();
  const createApp = useAppStore((state) => state.createApp);
  const updateApp = useAppStore((state) => state.updateApp);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(iconAssets[0]?.name ?? "default-app.svg");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setName(appItem?.name ?? "");
    setIcon(appItem?.icon ?? iconAssets[0]?.name ?? "default-app.svg");
    setUrl(appItem?.url ?? "");
    setError(null);
  }, [appItem, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const input = { name, icon, url };
      if (appItem) {
        await updateApp(appItem.id, input);
      } else {
        await createApp(input);
      }
      onOpenChange(false);
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="dialog-overlay"
    >
      <Modal className="dialog-modal">
        <Dialog
          aria-label={t(appItem ? "appForm.editTitle" : "appForm.createTitle")}
          className="dialog-content"
        >
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="dialog-heading">
              <h2>
                {t(appItem ? "appForm.editTitle" : "appForm.createTitle")}
              </h2>
              <button
                className="icon-button"
                type="button"
                aria-label={t("common.close")}
                onClick={() => onOpenChange(false)}
              >
                ×
              </button>
            </div>

            <label className="field">
              <span>{t("appForm.name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("appForm.namePlaceholder")}
                required
                maxLength={100}
                aria-invalid={Boolean(errorMessage(error, "name", t))}
              />
              {errorMessage(error, "name", t) && (
                <small className="field-error">
                  {errorMessage(error, "name", t)}
                </small>
              )}
            </label>

            <label className="field">
              <span>{t("appForm.icon")}</span>
              <select
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                required
                aria-invalid={Boolean(errorMessage(error, "icon", t))}
              >
                {iconAssets.map((asset) => (
                  <option value={asset.name} key={asset.name}>
                    {asset.name}
                  </option>
                ))}
              </select>
              {errorMessage(error, "icon", t) && (
                <small className="field-error">
                  {errorMessage(error, "icon", t)}
                </small>
              )}
            </label>

            <label className="field">
              <span>{t("appForm.url")}</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={t("appForm.urlPlaceholder")}
                type="url"
                required
                maxLength={2048}
                aria-invalid={Boolean(errorMessage(error, "url", t))}
              />
              {errorMessage(error, "url", t) && (
                <small className="field-error">
                  {errorMessage(error, "url", t)}
                </small>
              )}
            </label>

            {error !== null &&
              !(error instanceof ApiClientError && error.fields) && (
              <p className="form-error" role="alert">
                {t("appForm.requestFailed")}
              </p>
              )}

            <div className="dialog-actions">
              <Button
                color="secondary"
                onPress={() => onOpenChange(false)}
                isDisabled={submitting}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" isLoading={submitting}>
                {submitting
                  ? t(appItem ? "common.saving" : "appForm.creating")
                  : t(appItem ? "common.save" : "appForm.create")}
              </Button>
            </div>
          </form>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
