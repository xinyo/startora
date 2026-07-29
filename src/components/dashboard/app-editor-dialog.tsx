import { lazy, Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { DEFAULT_ICON_NAME } from "@/assets/registry";
import { Button } from "@/components/base/buttons/button";
import { ApiClientError } from "@/lib/api";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

const IconSelector = lazy(() =>
  import("@/components/dashboard/icon-selector").then((m) => ({
    default: m.IconSelector,
  })),
);

function IconSelectorFallback() {
  return (
    <div className="icon-selector">
      <div className="icon-selector-status" aria-live="polite">
        Loading icons…
      </div>
    </div>
  );
}

interface AppEditorDialogProps {
  appItem: AppItem | null;
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
}

function isCustomIconUrl(icon: string | undefined): boolean {
  if (!icon) {
    return false;
  }

  try {
    const parsedUrl = new URL(icon);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
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
  const categoriesById = useAppStore((state) => state.categoriesById);
  const categoryIds = useAppStore((state) => state.categoryIds);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_ICON_NAME);
  const [customIconUrl, setCustomIconUrl] = useState("");
  const [useCustomIcon, setUseCustomIcon] = useState(false);
  const [iconSearch, setIconSearch] = useState("");
  const [iconSearchEdited, setIconSearchEdited] = useState(false);
  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const categories = categoryIds
    .map((id) => categoriesById[id])
    .filter(Boolean);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const appName = appItem?.name ?? "";
    const hasCustomIcon = isCustomIconUrl(appItem?.icon);
    setName(appName);
    setIcon(
      hasCustomIcon ? DEFAULT_ICON_NAME : (appItem?.icon ?? DEFAULT_ICON_NAME),
    );
    setCustomIconUrl(hasCustomIcon ? (appItem?.icon ?? "") : "");
    setUseCustomIcon(hasCustomIcon);
    setIconSearch(appName);
    setIconSearchEdited(false);
    setUrl(appItem?.url ?? "");
    setCategoryId(appItem?.categoryId ?? null);
    setError(null);
  }, [appItem, isOpen]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const input = {
        name,
        icon: useCustomIcon ? customIconUrl : icon,
        url,
        categoryId: categoryId ?? undefined,
      };
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
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  if (!iconSearchEdited) {
                    setIconSearch(nextName);
                  }
                }}
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

            <div className="field">
              <div className="icon-field-heading">
                <span>{t("appForm.icon")}</span>
                <Button
                  type="button"
                  color="secondary"
                  onPress={() => {
                    setUseCustomIcon((current) => !current);
                    setError(null);
                  }}
                  aria-expanded={useCustomIcon}
                  aria-controls="custom-icon-url-field"
                >
                  {t(
                    useCustomIcon
                      ? "appForm.useBuiltInIcon"
                      : "appForm.useCustomIcon",
                  )}
                </Button>
              </div>
              {useCustomIcon ? (
                <label
                  className="icon-selector-search"
                  id="custom-icon-url-field"
                >
                  <span>{t("appForm.customIconUrl")}</span>
                  <input
                    value={customIconUrl}
                    onChange={(event) => setCustomIconUrl(event.target.value)}
                    placeholder={t("appForm.customIconUrlPlaceholder")}
                    type="url"
                    required
                    maxLength={2048}
                    aria-invalid={Boolean(errorMessage(error, "icon", t))}
                  />
                </label>
              ) : (
                <Suspense fallback={<IconSelectorFallback />}>
                  <IconSelector
                    value={icon}
                    searchValue={iconSearch}
                    onChange={setIcon}
                    onSearchChange={(nextSearch) => {
                      setIconSearch(nextSearch);
                      setIconSearchEdited(true);
                    }}
                    isInvalid={Boolean(errorMessage(error, "icon", t))}
                  />
                </Suspense>
              )}
              {errorMessage(error, "icon", t) && (
                <small className="field-error">
                  {errorMessage(error, "icon", t)}
                </small>
              )}
            </div>

            <label className="field">
              <span>{t("appForm.category")}</span>
              <select
                className="category-select"
                value={categoryId ?? ""}
                onChange={(event) => {
                  const val = event.target.value;
                  setCategoryId(val === "" ? null : Number(val));
                }}
                aria-label={t("appForm.category")}
              >
                <option value="">{t("appForm.categoryNone")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
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
