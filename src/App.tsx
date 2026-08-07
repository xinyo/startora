import AppLogo from "@/assets/logo-group.svg";
import { DEFAULT_ICON_NAME, getIconUrl, loadIconUrl } from "@/assets/registry";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { AppEditorDialog } from "@/components/dashboard/app-editor-dialog";
import { CategorySection } from "@/components/dashboard/category-section";
import type { CategoryDropPlacement } from "@/components/dashboard/category-section";
import { DeleteAppDialog } from "@/components/dashboard/delete-app-dialog";
import { ManageCategoriesDialog } from "@/components/dashboard/manage-categories-dialog";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";
import { cx } from "@/utils/cx";
import {
  Check,
  DotsGrid,
  Edit01,
  Folder,
  LogOut01,
  Plus,
  Trash01,
} from "@untitledui/icons";
import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface AppDropTarget {
  categoryId: number | null;
  position: number;
}

interface CategoryOrderDropTarget {
  categoryId: number;
  position: number;
  placement: CategoryDropPlacement;
}

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function isRemoteIconUrl(icon: string): boolean {
  try {
    const parsedUrl = new URL(icon);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function App() {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const appsById = useAppStore((state) => state.appsById);
  const appIds = useAppStore((state) => state.appIds);
  const categoriesById = useAppStore((state) => state.categoriesById);
  const categoryIds = useAppStore((state) => state.categoryIds);
  const errorCode = useAppStore((state) => state.errorCode);
  const initialized = useAppStore((state) => state.initialized);
  const logout = useAppStore((state) => state.logout);
  const reorderApp = useAppStore((state) => state.reorderApp);
  const reorderCategories = useAppStore((state) => state.reorderCategories);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);
  const [appDropTarget, setAppDropTarget] = useState<AppDropTarget | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<number | null>(
    null,
  );
  const [categoryDropTarget, setCategoryDropTarget] =
    useState<CategoryOrderDropTarget | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [reorderFailed, setReorderFailed] = useState(false);

  const apps = useMemo(
    () =>
      appIds
        .map((id) => appsById[id])
        .filter((appItem): appItem is AppItem => Boolean(appItem)),
    [appIds, appsById],
  );

  const groupedApps = useMemo(() => {
    const uncategorized: AppItem[] = [];
    const categorized: Record<number, AppItem[]> = {};

    for (const app of apps) {
      if (app.categoryId != null) {
        if (!categorized[app.categoryId]) {
          categorized[app.categoryId] = [];
        }
        categorized[app.categoryId].push(app);
      } else {
        uncategorized.push(app);
      }
    }

    const bySortId = (left: AppItem, right: AppItem) =>
      left.sortId - right.sortId || left.id - right.id;
    uncategorized.sort(bySortId);
    for (const categoryApps of Object.values(categorized)) {
      categoryApps.sort(bySortId);
    }

    return { uncategorized, categorized };
  }, [apps]);

  useEffect(() => {
    const iconNames = apps
      .map((appItem) => appItem.icon)
      .filter((icon): icon is string => Boolean(icon));
    if (iconNames.length === 0) return;

    const unique = [...new Set(iconNames)];
    void Promise.all(
      unique.map(async (name) => {
        const url = isRemoteIconUrl(name) ? name : await loadIconUrl(name);
        return { name, url };
      }),
    ).then((entries) => {
      setIconUrls((prev) => {
        const next = { ...prev };
        for (const { name, url } of entries) {
          next[name] = url;
        }
        return next;
      });
    });
  }, [apps]);

  const openCreateDialog = () => {
    setEditingApp(null);
    setEditorOpen(true);
  };

  const openEditDialog = (appItem: AppItem) => {
    setEditingApp(appItem);
    setEditorOpen(true);
  };

  const clearAppDragState = () => {
    setDraggedAppId(null);
    setAppDropTarget(null);
  };

  const clearCategoryDragState = () => {
    setDraggedCategoryId(null);
    setCategoryDropTarget(null);
  };

  const clearDragState = () => {
    clearAppDragState();
    clearCategoryDragState();
  };

  const toggleEditMode = () => {
    setIsEditMode((current) => !current);
    setReorderFailed(false);
    clearDragState();
  };

  const handleAppDragStart = (
    event: DragEvent<HTMLElement>,
    appItem: AppItem,
  ) => {
    if (!isEditMode || isSavingOrder) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(appItem.id));
    clearCategoryDragState();
    setDraggedAppId(appItem.id);
    setAppDropTarget(null);
    setReorderFailed(false);
  };

  const handleAppDragOver = (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
    categoryApps: AppItem[],
  ) => {
    if (draggedAppId === null || isSavingOrder) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const availableApps = categoryApps.filter(
      (appItem) => appItem.id !== draggedAppId,
    );
    const card = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-app-id]",
    );
    let position = availableApps.length;
    if (card) {
      const targetId = Number(card.dataset.appId);
      const targetIndex = availableApps.findIndex(
        (appItem) => appItem.id === targetId,
      );
      if (targetIndex >= 0) {
        const rect = card.getBoundingClientRect();
        const gridWidth = card.parentElement?.clientWidth ?? 0;
        const isSingleColumn = rect.width > 0 && gridWidth < rect.width * 1.5;
        const isBefore = isSingleColumn
          ? event.clientY < rect.top + rect.height / 2
          : event.clientX < rect.left + rect.width / 2;
        position = targetIndex + (isBefore ? 0 : 1);
      }
    }
    setAppDropTarget({ categoryId, position });
  };

  const handleCategoryOrderDragStart = (
    event: DragEvent<HTMLElement>,
    categoryId: number,
  ) => {
    if (!isEditMode || isSavingOrder) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `category:${categoryId}`);
    clearAppDragState();
    setDraggedCategoryId(categoryId);
    setCategoryDropTarget(null);
    setReorderFailed(false);
  };

  const handleCategoryOrderDragOver = (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
  ) => {
    if (
      draggedCategoryId === null ||
      categoryId === null ||
      categoryId === draggedCategoryId ||
      isSavingOrder
    ) {
      setCategoryDropTarget(null);
      return;
    }

    const availableCategoryIds = categoryIds.filter(
      (id) => id !== draggedCategoryId,
    );
    const targetIndex = availableCategoryIds.indexOf(categoryId);
    if (targetIndex < 0) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    const placement: CategoryDropPlacement =
      event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setCategoryDropTarget({
      categoryId,
      position: targetIndex + (placement === "before" ? 0 : 1),
      placement,
    });
  };

  const handleSectionDragOver = (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
    categoryApps: AppItem[],
  ) => {
    if (draggedCategoryId !== null) {
      handleCategoryOrderDragOver(event, categoryId);
      return;
    }
    handleAppDragOver(event, categoryId, categoryApps);
  };

  const handleSectionDragLeave = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    if (draggedCategoryId !== null) {
      setCategoryDropTarget(null);
    } else {
      setAppDropTarget(null);
    }
  };

  const handleAppDrop = async (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
  ) => {
    event.preventDefault();
    const appId = draggedAppId;
    const target = appDropTarget;
    if (
      appId === null ||
      !target ||
      target.categoryId !== categoryId ||
      isSavingOrder
    ) {
      clearAppDragState();
      return;
    }

    const draggedApp = appsById[appId];
    clearAppDragState();
    if (
      draggedApp &&
      draggedApp.categoryId === categoryId &&
      draggedApp.sortId === target.position
    ) {
      return;
    }

    setIsSavingOrder(true);
    setReorderFailed(false);
    try {
      await reorderApp(appId, categoryId, target.position);
    } catch {
      setReorderFailed(true);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCategoryOrderDrop = async (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
  ) => {
    event.preventDefault();
    const draggedId = draggedCategoryId;
    const target = categoryDropTarget;
    if (
      draggedId === null ||
      categoryId === null ||
      !target ||
      target.categoryId !== categoryId ||
      isSavingOrder
    ) {
      clearCategoryDragState();
      return;
    }

    const nextCategoryIds = categoryIds.filter((id) => id !== draggedId);
    if (target.position > nextCategoryIds.length) {
      clearCategoryDragState();
      return;
    }
    nextCategoryIds.splice(target.position, 0, draggedId);
    clearCategoryDragState();

    if (nextCategoryIds.every((id, index) => categoryIds[index] === id)) {
      return;
    }

    setIsSavingOrder(true);
    setReorderFailed(false);
    try {
      await reorderCategories(nextCategoryIds);
    } catch {
      setReorderFailed(true);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleSectionDrop = (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
  ) => {
    if (draggedCategoryId !== null) {
      void handleCategoryOrderDrop(event, categoryId);
      return;
    }
    void handleAppDrop(event, categoryId);
  };

  const renderAppCard = (
    appItem: AppItem,
    showDropBefore: boolean,
    showDropAfter: boolean,
  ) => {
    const iconUrl = iconUrls[appItem.icon];
    return (
      <article
        className={cx(
          "app-card",
          isEditMode && "app-card--editable",
          draggedAppId === appItem.id && "app-card--dragging",
          showDropBefore && "app-card--drop-before",
          showDropAfter && "app-card--drop-after",
        )}
        data-app-id={appItem.id}
        key={appItem.id}
        draggable={isEditMode && !isSavingOrder}
        aria-label={
          isEditMode
            ? t("dashboard.dragApp", { name: appItem.name })
            : undefined
        }
        onDragStart={(event) => {
          if (isEditMode) {
            handleAppDragStart(event, appItem);
          }
        }}
        onDragEnd={clearAppDragState}
      >
        {!isEditMode && (
          <Dropdown.Root>
            <div className="app-card-dropdown">
              <Dropdown.DotsButton
                aria-label={t("dashboard.appCardMenu", { name: appItem.name })}
              />
            </div>
            <Dropdown.Popover className="w-28">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "edit") {
                    openEditDialog(appItem);
                  } else if (key === "delete") {
                    setDeletingApp(appItem);
                  }
                }}
              >
                <Dropdown.Item
                  id="edit"
                  icon={Edit01}
                  label={t("common.edit")}
                />
                <Dropdown.Item
                  id="delete"
                  icon={Trash01}
                  label={t("common.delete")}
                  className="dropdown-item-destructive"
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        )}
        {isEditMode && (
          <span className="app-card-drag-handle" aria-hidden="true">
            <DotsGrid aria-hidden="true" />
          </span>
        )}
        <a
          className="app-link"
          href={appItem.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("dashboard.openApp", { name: appItem.name })}
          aria-disabled={isEditMode || undefined}
          tabIndex={isEditMode ? -1 : undefined}
          onClick={(event) => {
            if (isEditMode) {
              event.preventDefault();
            }
          }}
        >
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="app-icon"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(event) => {
                const fallbackUrl = getIconUrl(DEFAULT_ICON_NAME);
                if (event.currentTarget.getAttribute("src") !== fallbackUrl) {
                  event.currentTarget.src = fallbackUrl;
                }
              }}
            />
          )}
          <span>
            <strong>{appItem.name}</strong>
            <small>{hostnameFrom(appItem.url)}</small>
          </span>
        </a>
      </article>
    );
  };

  const renderCategory = (
    categoryId: number | null,
    categoryApps: AppItem[],
    name?: string,
  ) => {
    const isActiveTarget = appDropTarget?.categoryId === categoryId;
    const dropPosition = isActiveTarget
      ? (appDropTarget?.position ?? null)
      : null;
    const categoryDropPlacement =
      categoryId !== null && categoryDropTarget?.categoryId === categoryId
        ? categoryDropTarget.placement
        : null;
    const availableApps = categoryApps.filter(
      (appItem) => appItem.id !== draggedAppId,
    );
    const beforeId =
      dropPosition !== null && dropPosition < availableApps.length
        ? availableApps[dropPosition]?.id
        : undefined;
    const afterId =
      dropPosition !== null &&
      availableApps.length > 0 &&
      dropPosition === availableApps.length
        ? availableApps[availableApps.length - 1]?.id
        : undefined;

    return (
      <CategorySection
        key={categoryId ?? "uncategorized"}
        categoryId={categoryId}
        name={name}
        ariaLabel={
          categoryId === null ? t("categories.uncategorized") : undefined
        }
        isEditMode={isEditMode}
        isDropTarget={isActiveTarget}
        isCategoryDraggable={
          categoryId !== null && isEditMode && !isSavingOrder
        }
        isCategoryDragging={
          categoryId !== null && draggedCategoryId === categoryId
        }
        categoryDragLabel={
          categoryId !== null && name
            ? t("categories.dragCategory", { name })
            : undefined
        }
        categoryDropPlacement={categoryDropPlacement}
        onCategoryDragStart={(event) => {
          if (categoryId !== null) {
            handleCategoryOrderDragStart(event, categoryId);
          }
        }}
        onCategoryDragEnd={clearCategoryDragState}
        onDragOver={(event) =>
          handleSectionDragOver(event, categoryId, categoryApps)
        }
        onDragLeave={handleSectionDragLeave}
        onDrop={(event) => handleSectionDrop(event, categoryId)}
      >
        {categoryApps.map((appItem) =>
          renderAppCard(
            appItem,
            beforeId === appItem.id,
            afterId === appItem.id,
          ),
        )}
      </CategorySection>
    );
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <img className="eyebrow-logo mb-5" src={AppLogo}></img>

          <h1>{t("dashboard.greeting", { username: user?.username ?? "" })}</h1>
          <p className="dashboard-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="dashboard-actions">
          <Button iconLeading={Plus} onPress={openCreateDialog}>
            {t("dashboard.addApp")}
          </Button>
          <Dropdown.Root>
            <Dropdown.DotsButton
              className="dashboard-actions-menu-button"
              aria-label={t("dashboard.actionsMenu")}
            />
            <Dropdown.Popover className="w-52">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "edit-mode") {
                    toggleEditMode();
                  } else if (key === "manage-categories") {
                    setCategoriesOpen(true);
                  } else if (key === "logout") {
                    void logout();
                  }
                }}
              >
                <Dropdown.Item
                  id="edit-mode"
                  icon={isEditMode ? Check : Edit01}
                  label={t(
                    isEditMode
                      ? "dashboard.exitEditMode"
                      : "dashboard.enterEditMode",
                  )}
                  isDisabled={isSavingOrder}
                />
                <Dropdown.Item
                  id="manage-categories"
                  icon={Folder}
                  label={t("categories.manage")}
                />
                <Dropdown.Separator />
                <Dropdown.Item
                  id="logout"
                  icon={LogOut01}
                  label={t("dashboard.logout")}
                  className="dropdown-item-destructive"
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.Root>
        </div>
      </header>

      {errorCode === "APPS_LOAD_FAILED" && (
        <p className="page-alert" role="alert">
          {t("dashboard.loadFailed")}
        </p>
      )}

      {reorderFailed && (
        <p className="page-alert" role="alert">
          {t("dashboard.reorderFailed")}
        </p>
      )}

      {initialized && apps.length === 0 && !isEditMode ? (
        <section className="empty-state">
          <Button
            className="empty-icon u-press"
            aria-hidden="true"
            onPress={openCreateDialog}
          >
            +
          </Button>
          <h2>{t("dashboard.noAppsTitle")}</h2>
          <p>{t("dashboard.noAppsBody")}</p>
        </section>
      ) : (
        <>
          {(isEditMode || groupedApps.uncategorized.length > 0) &&
            renderCategory(null, groupedApps.uncategorized)}
          {categoryIds.map((catId) => {
            const category = categoriesById[catId];
            const catApps = groupedApps.categorized[catId] ?? [];
            return category
              ? renderCategory(catId, catApps, category.name)
              : null;
          })}
        </>
      )}

      <AppEditorDialog
        appItem={editingApp}
        isOpen={editorOpen}
        onOpenChange={setEditorOpen}
      />
      <DeleteAppDialog
        appItem={deletingApp}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingApp(null);
          }
        }}
      />
      <ManageCategoriesDialog
        isOpen={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
    </main>
  );
}

export default App;
