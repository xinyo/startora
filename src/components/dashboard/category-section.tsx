import type { FC, ReactNode } from "react";

interface CategorySectionProps {
  name?: string | null;
  children: ReactNode;
}

export const CategorySection: FC<CategorySectionProps> = ({
  name,
  children,
}) => {
  if (name) {
    return (
      <section className="category-section">
        <h2 className="category-section-heading">{name}</h2>
        <div className="category-section-grid">{children}</div>
      </section>
    );
  }

  return (
    <section className="category-section">
      <div className="category-section-grid">{children}</div>
    </section>
  );
};
