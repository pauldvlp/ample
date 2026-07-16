import { PageHeader } from "@/components/shared/page-header";
import { getCategoriesWithUsage } from "@/lib/data/categories";
import { getT } from "@/lib/i18n/server";
import {
  CategoriesView,
  AddCategoryButton,
  TranslateCategoriesButton,
} from "@/components/categories/categories-view";

export default async function CategoriesPage() {
  const t = await getT();
  const categories = await getCategoriesWithUsage();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("categories.eyebrow")}
        title={t("nav.categories")}
        description={t("categories.description")}
        actions={
          <div className="flex items-center gap-2">
            <TranslateCategoriesButton />
            <AddCategoryButton />
          </div>
        }
      />
      <CategoriesView categories={categories} />
    </div>
  );
}
