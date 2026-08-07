import { DotsGrid } from "@untitledui/icons";
import type { DragEvent, FC, ReactNode } from "react";
import { cx } from "@/utils/cx";

export type CategoryDropPlacement = "before" | "after";

interface CategorySectionProps {
  categoryId: number | null;
  name?: string | null;
  ariaLabel?: string;
  children: ReactNode;
  isEditMode?: boolean;
  isDropTarget?: boolean;
  isCategoryDraggable?: boolean;
  isCategoryDragging?: boolean;
  categoryDragLabel?: string;
  categoryDropPlacement?: CategoryDropPlacement | null;
  onCategoryDragStart?(event: DragEvent<HTMLElement>): void;
  onCategoryDragEnd?(event: DragEvent<HTMLElement>): void;
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
  isCategoryDraggable = false,
  isCategoryDragging = false,
  categoryDragLabel,
  categoryDropPlacement = null,
  onCategoryDragStart,
  onCategoryDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const categoryDragDescriptionId =
    categoryId === null ? undefined : `category-drag-description-${categoryId}`;
  const sectionProps = {
    "data-category-id": categoryId ?? "uncategorized",
    "data-edit-mode": isEditMode || undefined,
    "data-drop-target": isDropTarget || undefined,
    "data-category-drop-placement": categoryDropPlacement ?? undefined,
    className: cx(
      "category-section",
      isEditMode && "category-section--editable",
      isDropTarget && "category-section--drop-target",
      isCategoryDragging && "category-section--category-dragging",
      categoryDropPlacement === "before" &&
        "category-section--category-drop-before",
      categoryDropPlacement === "after" &&
        "category-section--category-drop-after",
    ),
    "aria-label": name ? undefined : ariaLabel,
    onDragOver,
    onDragLeave,
    onDrop,
  };

  if (name) {
    return (
      <section {...sectionProps}>
        <h2
          className={cx(
            "category-section-heading",
            isEditMode && "category-section-heading--drag-handle",
          )}
          data-category-drag-handle={isEditMode || undefined}
          draggable={isCategoryDraggable}
          aria-describedby={
            isCategoryDraggable ? categoryDragDescriptionId : undefined
          }
          onDragStart={onCategoryDragStart}
          onDragEnd={onCategoryDragEnd}
        >
          {isEditMode && (
            <DotsGrid
              className="category-section-heading-icon"
              aria-hidden="true"
            />
          )}
          <span>{name}</span>
        </h2>
        {isCategoryDraggable && categoryDragLabel && (
          <span
            id={categoryDragDescriptionId}
            className="category-section-drag-description"
          >
            {categoryDragLabel}
          </span>
        )}
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
