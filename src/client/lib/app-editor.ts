export interface AppDraft {
  id: number | null;
  name: string;
  url: string;
}

export function createEmptyAppDraft(): AppDraft {
  return {
    id: null,
    name: "",
    url: "http://",
  };
}

export function createAppDraftFromApp(app: {
  id: number;
  appName: string;
  appData?: { url?: string };
}): AppDraft {
  return {
    id: app.id,
    name: app.appName,
    url: app.appData?.url ?? "http://",
  };
}

export async function saveAppDraft(
  store: {
    addUserApp: (name: string, data: { url: string }) => Promise<unknown>;
    putUserApp: (
      appId: number,
      name: string,
      data: { url: string },
    ) => Promise<unknown>;
  },
  draft: AppDraft,
): Promise<unknown> {
  if (draft.id === null) {
    return store.addUserApp(draft.name, { url: draft.url });
  }

  return store.putUserApp(draft.id, draft.name, { url: draft.url });
}
