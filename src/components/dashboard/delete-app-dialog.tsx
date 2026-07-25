import { useEffect, useState } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

interface DeleteAppDialogProps {
  appItem: AppItem | null;
  onOpenChange(isOpen: boolean): void;
}

export function DeleteAppDialog({
  appItem,
  onOpenChange,
}: DeleteAppDialogProps) {
  const { t } = useTranslation();
  const deleteApp = useAppStore((state) => state.deleteApp);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [appItem]);

  const confirmDelete = async () => {
    if (!appItem) {
      return;
    }
    setDeleting(true);
    setFailed(false);
    try {
      await deleteApp(appItem.id);
      onOpenChange(false);
    } catch {
      setFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalOverlay
      isOpen={Boolean(appItem)}
      onOpenChange={onOpenChange}
      isDismissable
      className="dialog-overlay"
    >
      <Modal className="dialog-modal dialog-modal-small">
        <Dialog
          aria-label={t("deleteDialog.title", { name: appItem?.name ?? "" })}
          className="dialog-content"
        >
          <div className="dialog-heading">
            <h2>{t("deleteDialog.title", { name: appItem?.name ?? "" })}</h2>
          </div>
          <p className="dialog-copy">{t("deleteDialog.body")}</p>
          {failed && (
            <p className="form-error" role="alert">
              {t("deleteDialog.requestFailed")}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              color="secondary"
              onPress={() => onOpenChange(false)}
              isDisabled={deleting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              color="primary-destructive"
              onPress={() => void confirmDelete()}
              isLoading={deleting}
            >
              {deleting
                ? t("deleteDialog.deleting")
                : t("deleteDialog.confirm")}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
