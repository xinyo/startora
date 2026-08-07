import AppLogo from "@/assets/logo-group.svg";
import { DEFAULT_ICON_NAME, getIconUrl, loadIconUrl } from "@/assets/registry";
import { Button } from "@/components/base/buttons/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { AppEditorDialog } from "@/components/dashboard/app-editor-dialog";
import { CategorySection } from "@/components/dashboard/category-section";
import { DeleteAppDialog } from "@/components/dashboard/delete-app-dialog";
import { ManageCategoriesDialog } from "@/components/dashboard/manage-categories-dialog";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";
import { cx } from "@/utils/cx";
import { Check, DotsGrid, Edit01, Trash01 } from "@untitledui/icons";
import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface DropTarget {
  categoryId: number | null;
  position: number;
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
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

  const clearDragState = () => {
    setDraggedAppId(null);
    setDropTarget(null);
  };

  const toggleEditMode = () => {
    setIsEditMode((current) => !current);
    setReorderFailed(false);
    clearDragState();
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, appItem: AppItem) => {
    if (!isEditMode || isSavingOrder) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(appItem.id));
    setDraggedAppId(appItem.id);
    setDropTarget(null);
    setReorderFailed(false);
  };

  const handleCategoryDragOver = (
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
    setDropTarget({ categoryId, position });
  };

  const handleCategoryDragLeave = (event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }
    setDropTarget(null);
  };

  const handleDrop = async (
    event: DragEvent<HTMLElement>,
    categoryId: number | null,
  ) => {
    event.preventDefault();
    const appId = draggedAppId;
    const target = dropTarget;
    if (
      appId === null ||
      !target ||
      target.categoryId !== categoryId ||
      isSavingOrder
    ) {
      clearDragState();
      return;
    }

    const draggedApp = appsById[appId];
    clearDragState();
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
            handleDragStart(event, appItem);
          }
        }}
        onDragEnd={clearDragState}
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
    const isActiveTarget = dropTarget?.categoryId === categoryId;
    const dropPosition = isActiveTarget ? (dropTarget?.position ?? null) : null;
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
        onDragOver={(event) =>
          handleCategoryDragOver(event, categoryId, categoryApps)
        }
        onDragLeave={handleCategoryDragLeave}
        onDrop={(event) => void handleDrop(event, categoryId)}
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
          <Button color="secondary" onPress={() => void logout()}>
            {t("dashboard.logout")}
          </Button>
          <Button color="secondary" onPress={() => setCategoriesOpen(true)}>
            {t("categories.manage")}
          </Button>
          <Button
            color={isEditMode ? "primary" : "secondary"}
            iconLeading={isEditMode ? Check : Edit01}
            aria-label={t(
              isEditMode ? "dashboard.exitEditMode" : "dashboard.enterEditMode",
            )}
            aria-pressed={isEditMode}
            isDisabled={isSavingOrder}
            onPress={toggleEditMode}
          >
            {isEditMode
              ? t("dashboard.exitEditMode")
              : t("dashboard.enterEditMode")}
          </Button>
          <Button onPress={openCreateDialog}>{t("dashboard.addApp")}</Button>
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

      {initialized && apps.length === 0 ? (
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
