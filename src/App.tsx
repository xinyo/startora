import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/base/buttons/button";
import { AppEditorDialog } from "@/components/dashboard/app-editor-dialog";
import { DeleteAppDialog } from "@/components/dashboard/delete-app-dialog";
import { DEFAULT_ICON_NAME, getIconUrl } from "@/assets/registry";
import { useAppStore } from "@/store";
import type { AppItem } from "@/types/contracts";

function hostnameFrom(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function App() {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const appsById = useAppStore((state) => state.appsById);
  const appIds = useAppStore((state) => state.appIds);
  const errorCode = useAppStore((state) => state.errorCode);
  const logout = useAppStore((state) => state.logout);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [deletingApp, setDeletingApp] = useState<AppItem | null>(null);

  const apps = useMemo(
    () =>
      appIds
        .map((id) => appsById[id])
        .filter((appItem): appItem is AppItem => Boolean(appItem)),
    [appIds, appsById],
  );

  const openCreateDialog = () => {
    setEditingApp(null);
    setEditorOpen(true);
  };

  const openEditDialog = (appItem: AppItem) => {
    setEditingApp(appItem);
    setEditorOpen(true);
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t("dashboard.greeting", { username: user?.username ?? "" })}</h1>
          <p className="dashboard-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="dashboard-actions">
          <Button color="secondary" onPress={() => void logout()}>
            {t("dashboard.logout")}
          </Button>
          <Button onPress={openCreateDialog}>{t("dashboard.addApp")}</Button>
        </div>
      </header>

      {errorCode === "APPS_LOAD_FAILED" && (
        <p className="page-alert" role="alert">
          {t("dashboard.loadFailed")}
        </p>
      )}

      {apps.length === 0 ? (
        <section className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            +
          </div>
          <h2>{t("dashboard.noAppsTitle")}</h2>
          <p>{t("dashboard.noAppsBody")}</p>
          <Button onPress={openCreateDialog}>{t("dashboard.addApp")}</Button>
        </section>
      ) : (
        <section className="app-grid" aria-label={t("dashboard.eyebrow")}>
          {apps.map((appItem) => {
            const iconUrl = getIconUrl(appItem.icon);
            return (
              <article className="app-card" key={appItem.id}>
                <a
                  className="app-link"
                  href={appItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t("dashboard.openApp", { name: appItem.name })}
                >
                  <img
                    src={iconUrl}
                    alt=""
                    className="app-icon"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      const fallbackUrl = getIconUrl(DEFAULT_ICON_NAME);
                      if (
                        event.currentTarget.getAttribute("src") !== fallbackUrl
                      ) {
                        event.currentTarget.src = fallbackUrl;
                      }
                    }}
                  />
                  <span>
                    <strong>{appItem.name}</strong>
                    <small>{hostnameFrom(appItem.url)}</small>
                  </span>
                </a>
                <div className="app-card-actions">
                  <Button
                    color="tertiary"
                    size="xs"
                    aria-label={t("dashboard.editApp", { name: appItem.name })}
                    onPress={() => openEditDialog(appItem)}
                  >
                    {t("common.edit")}
                  </Button>
                  <Button
                    color="link-destructive"
                    size="xs"
                    aria-label={t("dashboard.deleteApp", { name: appItem.name })}
                    onPress={() => setDeletingApp(appItem)}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
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
    </main>
  );
}

export default App;
