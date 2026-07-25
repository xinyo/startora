import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, SyntheticEvent, UIEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_ICON_NAME,
  getIconUrl,
  iconManifest,
  loadIconUrl,
} from "@/assets/registry";
import type { IconAsset } from "@/assets/registry";

const RESULT_BATCH_SIZE = 60;

interface IconSelectorProps {
  value: string;
  searchValue: string;
  isInvalid?: boolean;
  onChange(value: string): void;
  onSearchChange(value: string): void;
}

function iconLabel(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedIconName(filename: string): string {
  return iconLabel(filename).replace(/\s+/g, "").toLocaleLowerCase();
}

function normalizedSearch(value: string): string {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/[\s_-]+/g, "")
    .toLocaleLowerCase();
}

function handleImageError(event: SyntheticEvent<HTMLImageElement>): void {
  const defaultIconUrl = getIconUrl(DEFAULT_ICON_NAME);
  if (event.currentTarget.getAttribute("src") !== defaultIconUrl) {
    event.currentTarget.src = defaultIconUrl;
  }
}

export function IconSelector({
  value,
  searchValue,
  isInvalid = false,
  onChange,
  onSearchChange,
}: IconSelectorProps) {
  const { t } = useTranslation();
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE);
  const resolvingRef = useRef<Set<string>>(new Set());

  const query = normalizedSearch(searchValue);
  const hasQuery = query.length > 0;

  const matches = useMemo<IconAsset[]>(() => {
    if (!hasQuery) {
      return [
        {
          name: DEFAULT_ICON_NAME,
          url: resolvedUrls[DEFAULT_ICON_NAME] ?? getIconUrl(DEFAULT_ICON_NAME),
        },
      ];
    }

    return iconManifest
      .filter(
        (name) =>
          query.length === 0 || normalizedIconName(name).includes(query),
      )
      .map((name) => ({
        name,
        url: resolvedUrls[name] ?? getIconUrl(name),
      }));
  }, [hasQuery, query, resolvedUrls]);

  const results = hasQuery
    ? matches.length > 0
      ? matches
      : [
          {
            name: DEFAULT_ICON_NAME,
            url:
              resolvedUrls[DEFAULT_ICON_NAME] ?? getIconUrl(DEFAULT_ICON_NAME),
          },
        ]
    : matches;

  const visibleResults = results.slice(0, visibleCount);

  const resolveIconUrls = useCallback(
    async (names: string[]) => {
      const toResolve = names.filter(
        (name) => !resolvingRef.current.has(name) && !resolvedUrls[name],
      );
      if (toResolve.length === 0) return;

      for (const name of toResolve) {
        resolvingRef.current.add(name);
      }

      const entries = await Promise.all(
        toResolve.map(async (name) => {
          const url = await loadIconUrl(name);
          return { name, url };
        }),
      );

      setResolvedUrls((prev) => {
        const next = { ...prev };
        for (const { name, url } of entries) {
          next[name] = url;
          resolvingRef.current.delete(name);
        }
        return next;
      });
    },
    [resolvedUrls],
  );

  useEffect(() => {
    const names = visibleResults.map((asset) => asset.name);
    void resolveIconUrls(names);
  }, [visibleResults, resolveIconUrls]);

  useEffect(() => {
    setVisibleCount(RESULT_BATCH_SIZE);
  }, [query]);

  useEffect(() => {
    if (!hasQuery && value !== DEFAULT_ICON_NAME) {
      onChange(DEFAULT_ICON_NAME);
    }
    if (hasQuery && matches.length === 0 && value !== DEFAULT_ICON_NAME) {
      onChange(DEFAULT_ICON_NAME);
    }
  }, [hasQuery, matches.length, onChange, value]);

  const revealNextBatch = () => {
    setVisibleCount((currentCount) =>
      Math.min(currentCount + RESULT_BATCH_SIZE, results.length),
    );
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const distanceFromEnd =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromEnd < 120 && visibleCount < results.length) {
      revealNextBatch();
    }
  };

  const handleTileFocus = (event: FocusEvent<HTMLButtonElement>) => {
    const index = Number(event.currentTarget.dataset.resultIndex);
    if (
      Number.isFinite(index) &&
      index >= visibleResults.length - 4 &&
      visibleCount < results.length
    ) {
      revealNextBatch();
    }
  };

  return (
    <div className="icon-selector">
      <label className="icon-selector-search">
        <span>{t("appForm.iconSearch")}</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("appForm.iconSearchPlaceholder")}
          aria-invalid={isInvalid}
        />
      </label>

      <p className="icon-selector-status" aria-live="polite">
        {hasQuery
          ? matches.length > 0
            ? t("appForm.iconResults", { count: matches.length })
            : t("appForm.iconNoResults")
          : t("appForm.iconEmptyPrompt")}
      </p>

      <div
        className="icon-selector-grid"
        role="radiogroup"
        aria-label={t("appForm.icon")}
        aria-invalid={isInvalid}
        onScroll={handleScroll}
      >
        {visibleResults.map((asset, index) => {
          const label = iconLabel(asset.name);
          return (
            <button
              type="button"
              role="radio"
              aria-checked={value === asset.name}
              aria-label={label}
              title={label}
              className="icon-selector-option"
              data-result-index={index}
              key={asset.name}
              onClick={() => onChange(asset.name)}
              onFocus={handleTileFocus}
            >
              <img
                src={asset.url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={handleImageError}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
