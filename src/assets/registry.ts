const importedAssets = import.meta.glob(
  "./*.{svg,png,webp,jpg,jpeg,avif}",
  {
    eager: true,
    query: "?url",
    import: "default",
  },
) as Record<string, string>;

export interface IconAsset {
  name: string;
  url: string;
}

export const iconAssets: IconAsset[] = Object.entries(importedAssets)
  .map(([path, url]) => ({
    name: path.slice(path.lastIndexOf("/") + 1),
    url,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));

const iconUrls = Object.fromEntries(
  iconAssets.map((asset) => [asset.name, asset.url]),
) as Record<string, string>;

export function getIconUrl(iconName: string): string | null {
  return iconUrls[iconName] ?? null;
}
