import { useEffect, useMemo, useState } from "react";
import type { FocusEvent, SyntheticEvent, UIEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_ICON_NAME,
  getIconUrl,
  iconAssets,
} from "@/assets/registry";

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
  const [visibleCount, setVisibleCount] = useState(RESULT_BATCH_SIZE);
  const query = normalizedSearch(searchValue);
  const matches = useMemo(
    () =>
      iconAssets.filter(
        (asset) => query.length === 0 || normalizedIconName(asset.name).includes(query),
      ),
    [query],
  );
  const hasMatches = matches.length > 0;
  const results = hasMatches
    ? matches
    : iconAssets.filter((asset) => asset.name === DEFAULT_ICON_NAME);
  const visibleResults = results.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(RESULT_BATCH_SIZE);
  }, [query]);

  useEffect(() => {
    if (!hasMatches && value !== DEFAULT_ICON_NAME) {
      onChange(DEFAULT_ICON_NAME);
    }
  }, [hasMatches, onChange, value]);

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
        {hasMatches
          ? t("appForm.iconResults", { count: matches.length })
          : t("appForm.iconNoResults")}
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
