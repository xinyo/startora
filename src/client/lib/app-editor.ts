export interface AppDraft {
  id: number | null;
  name: string;
  protocol: "http://" | "https://";
  url: string;
}

export function createEmptyAppDraft(): AppDraft {
  return {
    id: null,
    name: "",
    protocol: "http://",
    url: "",
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
  appData?: { url?: string };
}): AppDraft {
  const splitUrl = splitAppUrl(app.appData?.url);

  return {
    id: app.id,
    name: app.appName,
    protocol: splitUrl.protocol,
    url: splitUrl.url,
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
  const nextUrl = joinAppUrl(draft);

  if (draft.id === null) {
    return store.addUserApp(draft.name, { url: nextUrl });
  }

  return store.putUserApp(draft.id, draft.name, { url: nextUrl });
}
