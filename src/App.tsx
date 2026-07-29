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
import { Edit01, Trash01 } from "@untitledui/icons";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [iconUrls, setIconUrls] = useState<Record<string, string>>({});

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

  const renderAppCard = (appItem: AppItem) => {
    const iconUrl = iconUrls[appItem.icon];
    return (
      <article className="app-card" key={appItem.id}>
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
              <Dropdown.Item id="edit" icon={Edit01} label={t("common.edit")} />
              <Dropdown.Item
                id="delete"
                icon={Trash01}
                label={t("common.delete")}
                className="dropdown-item-destructive"
              />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown.Root>
        <a
          className="app-link"
          href={appItem.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("dashboard.openApp", { name: appItem.name })}
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
          <Button onPress={openCreateDialog}>{t("dashboard.addApp")}</Button>
        </div>
      </header>

      {errorCode === "APPS_LOAD_FAILED" && (
        <p className="page-alert" role="alert">
          {t("dashboard.loadFailed")}
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
          {groupedApps.uncategorized.length > 0 && (
            <CategorySection>
              {groupedApps.uncategorized.map(renderAppCard)}
            </CategorySection>
          )}
          {categoryIds.map((catId) => {
            const category = categoriesById[catId];
            const catApps = groupedApps.categorized[catId];
            return (
              <CategorySection key={catId} name={category.name}>
                {catApps && catApps.map(renderAppCard)}
              </CategorySection>
            );
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
