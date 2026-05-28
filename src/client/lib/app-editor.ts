export interface AppDraft {
  id: number | null;
  name: string;
  protocol: "http://" | "https://";
  url: string;
  icon: string;
  description: string;
}

export function createEmptyAppDraft(): AppDraft {
  return {
    id: null,
    name: "",
    protocol: "http://",
    url: "",
    icon: "",
    description: "",
  };
}

export function splitAppUrl(url?: string): Pick<AppDraft, "protocol" | "url"> {
  if (url?.startsWith("https://")) {
    return {
      protocol: "https://",
      url: url.slice("https://".length),
    };
  }

  if (url?.startsWith("http://")) {
    return {
      protocol: "http://",
      url: url.slice("http://".length),
    };
  }

  return {
    protocol: "http://",
    url: url ?? "",
  };
}

export function joinAppUrl(draft: Pick<AppDraft, "protocol" | "url">): string {
  return `${draft.protocol}${draft.url}`;
}

export function createAppDraftFromApp(app: {
  id: number;
  appName: string;
  appData?: {
    url?: string;
    icon?: string;
    description?: string;
  };
}): AppDraft {
  const splitUrl = splitAppUrl(app.appData?.url);

  return {
    id: app.id,
    name: app.appName,
    protocol: splitUrl.protocol,
    url: splitUrl.url,
    icon: app.appData?.icon ?? "",
    description: app.appData?.description ?? "",
  };
}

export async function saveAppDraft(
  store: {
    addUserApp: (
      name: string,
      data: { url: string; icon: string; description: string },
    ) => Promise<unknown>;
    putUserApp: (
      appId: number,
      name: string,
      data: { url: string; icon: string; description: string },
    ) => Promise<unknown>;
  },
  draft: AppDraft,
): Promise<unknown> {
  const nextAppData = {
    url: joinAppUrl(draft),
    icon: draft.icon,
    description: draft.description,
  };

  if (draft.id === null) {
    return store.addUserApp(draft.name, nextAppData);
  }

  return store.putUserApp(draft.id, draft.name, nextAppData);
}
