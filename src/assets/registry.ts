const importedAssets = import.meta.glob(
  ["./*.{svg,png,webp,jpg,jpeg,avif}", "./logos/*.{svg,png,webp,jpg,jpeg,avif}"],
  {
    eager: true,
    query: "?url&no-inline",
    import: "default",
  },
) as Record<string, string>;

export interface IconAsset {
  name: string;
  url: string;
}

export const DEFAULT_ICON_NAME = "default-app.svg";

export const iconAssets: IconAsset[] = Object.entries(importedAssets)
  .map(([path, url]) => ({
    name: path.slice(path.lastIndexOf("/") + 1),
    url,
  }))
  .sort((left, right) => {
    if (left.name === DEFAULT_ICON_NAME) {
      return -1;
    }
    if (right.name === DEFAULT_ICON_NAME) {
      return 1;
    }
    return left.name.localeCompare(right.name);
  });

const iconUrls = Object.fromEntries(
  iconAssets.map((asset) => [asset.name, asset.url]),
) as Record<string, string>;

export function getIconUrl(iconName: string): string {
  return iconUrls[iconName] ?? iconUrls[DEFAULT_ICON_NAME];
}
