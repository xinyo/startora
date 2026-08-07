import type { DragEvent, FC, ReactNode } from "react";
import { cx } from "@/utils/cx";

interface CategorySectionProps {
  categoryId: number | null;
  name?: string | null;
  ariaLabel?: string;
  children: ReactNode;
  isEditMode?: boolean;
  isDropTarget?: boolean;
  onDragOver?(event: DragEvent<HTMLElement>): void;
  onDragLeave?(event: DragEvent<HTMLElement>): void;
  onDrop?(event: DragEvent<HTMLElement>): void;
}

export const CategorySection: FC<CategorySectionProps> = ({
  categoryId,
  name,
  ariaLabel,
  children,
  isEditMode = false,
  isDropTarget = false,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const sectionProps = {
    "data-category-id": categoryId ?? "uncategorized",
    "data-edit-mode": isEditMode || undefined,
    "data-drop-target": isDropTarget || undefined,
    className: cx(
      "category-section",
      isEditMode && "category-section--editable",
      isDropTarget && "category-section--drop-target",
    ),
    "aria-label": name ? undefined : ariaLabel,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  if (name) {
    return (
      <section {...sectionProps}>
        <h2 className="category-section-heading">{name}</h2>
        <div className="category-section-grid">{children}</div>
      </section>
    );
  }

  return (
    <section {...sectionProps}>
      <div className="category-section-grid">{children}</div>
    </section>
  );
};
