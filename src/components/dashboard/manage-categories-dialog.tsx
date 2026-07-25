import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { ApiClientError } from "@/lib/api";
import { useAppStore } from "@/store";
import type { CategoryItem } from "@/types/contracts";
import { cx } from "@/utils/cx";

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
}

function CategoryRow({
  category,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  category: CategoryItem;
  onEdit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSaveEdit = () => {
    const trimmed = editName.trim();
    if (trimmed.length > 0 && trimmed !== category.name) {
      onEdit(category.id, trimmed);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="category-row" key={category.id}>
        <input
          ref={inputRef}
          className="category-edit-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSaveEdit();
            }
            if (e.key === "Escape") {
              setEditName(category.name);
              setEditing(false);
            }
          }}
          maxLength={100}
          aria-label={t("categories.editCategory")}
        />
      </div>
    );
  }

  return (
    <div className="category-row" key={category.id}>
      <span className="category-row-name">{category.name}</span>
      <div className="category-row-actions">
        <button
          className="icon-button"
          type="button"
          aria-label={t("categories.moveUp")}
          disabled={isFirst}
          onClick={() => onMoveUp(category.id)}
        >
          ↑
        </button>
        <button
          className="icon-button"
          type="button"
          aria-label={t("categories.moveDown")}
          disabled={isLast}
          onClick={() => onMoveDown(category.id)}
        >
          ↓
        </button>
        <Button
          color="tertiary"
          size="xs"
          onPress={() => {
            setEditName(category.name);
            setEditing(true);
          }}
        >
          {t("common.edit")}
        </Button>
        <Button
          color="link-destructive"
          size="xs"
          onPress={() => onDelete(category.id)}
        >
          {t("common.delete")}
        </Button>
      </div>
    </div>
  );
}

export function ManageCategoriesDialog({
  isOpen,
  onOpenChange,
}: ManageCategoriesDialogProps) {
  const { t } = useTranslation();
  const categoriesById = useAppStore((state) => state.categoriesById);
  const categoryIds = useAppStore((state) => state.categoryIds);
  const createCategory = useAppStore((state) => state.createCategory);
  const updateCategory = useAppStore((state) => state.updateCategory);
  const deleteCategory = useAppStore((state) => state.deleteCategory);
  const reorderCategories = useAppStore((state) => state.reorderCategories);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  const categories = categoryIds
    .map((id) => categoriesById[id])
    .filter(Boolean);

  useEffect(() => {
    if (!isOpen) {
      setNewName("");
      setCreating(false);
      setError(null);
      setDeletingId(null);
      setDeleteError(false);
    }
  }, [isOpen]);

  const handleAdd = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await createCategory({ name: trimmed });
      setNewName("");
    } catch (caughtError) {
      setError(caughtError);
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (id: number, name: string) => {
    try {
      await updateCategory(id, { name });
    } catch {
      // Silently fail for inline edits
    }
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    setDeleteError(false);
    try {
      await deleteCategory(id);
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveUp = (id: number) => {
    const idx = categoryIds.indexOf(id);
    if (idx <= 0) {
      return;
    }
    const next = [...categoryIds];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    void reorderCategories(next);
  };

  const handleMoveDown = (id: number) => {
    const idx = categoryIds.indexOf(id);
    if (idx === -1 || idx >= categoryIds.length - 1) {
      return;
    }
    const next = [...categoryIds];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    void reorderCategories(next);
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
          aria-label={t("categories.manageTitle")}
          className="dialog-content"
        >
          <div className="dialog-heading">
            <h2>{t("categories.manageTitle")}</h2>
            <button
              className="icon-button"
              type="button"
              aria-label={t("common.close")}
              onClick={() => onOpenChange(false)}
            >
              ×
            </button>
          </div>

          <form
            className="category-add-form"
            onSubmit={(e) => void handleAdd(e)}
          >
            <input
              className="category-add-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("categories.namePlaceholder")}
              maxLength={100}
              aria-label={t("categories.addCategory")}
            />
            <Button
              type="submit"
              isLoading={creating}
              isDisabled={newName.trim().length === 0}
            >
              {t("categories.addCategory")}
            </Button>
          </form>

          {error instanceof ApiClientError && error.fields?.name && (
            <p className="form-error" role="alert">
              {t("categories.nameInvalid")}
            </p>
          )}

          {error !== null &&
            !(error instanceof ApiClientError && error.fields) && (
              <p className="form-error" role="alert">
                {t("categories.requestFailed")}
              </p>
            )}

          {deleteError && (
            <p className="form-error" role="alert">
              {t("categories.deleteFailed")}
            </p>
          )}

          {categories.length === 0 ? (
            <p className="dialog-copy">{t("categories.noCategories")}</p>
          ) : (
            <div className="category-list" role="list">
              {categories.map((cat, index) => (
                <CategoryRow
                  key={cat.id}
                  category={cat}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isFirst={index === 0}
                  isLast={index === categories.length - 1}
                />
              ))}
            </div>
          )}

          <div className="dialog-actions">
            <Button color="secondary" onPress={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
