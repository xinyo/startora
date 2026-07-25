import manifest from "./logos/manifest.json" with { type: "json" };

const eagerAssets = import.meta.glob("./*.{svg,png,webp,jpg,jpeg,avif}", {
  eager: true,
  query: "?url&no-inline",
  import: "default",
}) as Record<string, string>;

const logoImporters = import.meta.glob(
  "./logos/*.{svg,png,webp,jpg,jpeg,avif}",
  {
    eager: false,
    query: "?url&no-inline",
    import: "default",
  },
) as Record<string, () => Promise<string>>;

export interface IconAsset {
  name: string;
  url: string;
}

export const DEFAULT_ICON_NAME = "default-app.svg";

export const iconManifest: string[] = (manifest as { files: string[] }).files;

const eagerIconUrls = Object.fromEntries(
  Object.entries(eagerAssets).map(([path, url]) => [
    path.slice(path.lastIndexOf("/") + 1),
    url,
  ]),
) as Record<string, string>;

const lazyIconUrls: Record<string, string> = {};

export function getIconUrl(iconName: string): string {
  return (
    eagerIconUrls[iconName] ??
    lazyIconUrls[iconName] ??
    eagerIconUrls[DEFAULT_ICON_NAME]
  );
}

export async function loadIconUrl(iconName: string): Promise<string> {
  if (eagerIconUrls[iconName]) return eagerIconUrls[iconName];
  if (lazyIconUrls[iconName]) return lazyIconUrls[iconName];

  const key = `./logos/${iconName}`;
  const importer = logoImporters[key];
  if (importer) {
    const url = await importer();
    lazyIconUrls[iconName] = url;
    return url;
  }
  return eagerIconUrls[DEFAULT_ICON_NAME];
}

export async function loadAppIcons(iconNames: string[]): Promise<void> {
  const needed = iconNames.filter(
    (name) => !eagerIconUrls[name] && !lazyIconUrls[name],
  );
  if (needed.length === 0) return;
  await Promise.all(needed.map((name) => loadIconUrl(name)));
}
