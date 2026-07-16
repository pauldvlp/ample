import type { Dict } from "./_types";

// Filled during i18n rollout. Keys are prefixed with "categories.".
export const categories: Dict = {
  es: {
    "categories.eyebrow": "Organiza",
    "categories.description":
      "Agrupa tus ingresos y gastos para que cada transacción cuente una historia clara.",
    "categories.add": "Agregar categoría",
    "categories.translate": "Traducir con IA",
    "categories.translateTitle": "¿Traducir categorías al {lang}?",
    "categories.translateBody":
      "La IA traducirá los nombres de tus categorías al {lang}. Es reversible (puedes volver a traducir al otro idioma).",
    "categories.translated": "{n} categorías traducidas",
    "categories.translateNoop": "Tus categorías ya están en {lang}",
    "categories.translateError": "No se pudo traducir. {error}",
    "categories.create": "Crear categoría",

    "categories.groupTransfer": "Transferencias",
    "categories.count": "{n} categorías",
    "categories.countOne": "{n} categoría",
    "categories.txCount": "{n} transacciones",
    "categories.txCountOne": "{n} transacción",

    "categories.archived": "Archivada",
    "categories.archive": "Archivar",
    "categories.restore": "Restaurar",
    "categories.rowActions": "Acciones de {name}",
    "categories.addKind": "Agregar categoría de {kind}",
    "categories.emptyTitle": "Sin categorías de {kind}",
    "categories.emptyDesc":
      "Agrega tu primera categoría de {kind} para empezar a organizar.",

    "categories.toastCreated": "Categoría creada",
    "categories.toastUpdated": "Categoría actualizada",
    "categories.toastArchived": "Categoría archivada",
    "categories.toastRestored": "Categoría restaurada",
    "categories.toastDeleted": "Categoría eliminada",

    "categories.deleteTitle": "¿Eliminar categoría?",
    "categories.deleteDesc": "«{name}» se eliminará de forma permanente.",
    "categories.deleteDescTx":
      " Sus {n} transacciones conservan su historial pero quedan sin categoría.",
    "categories.deleteDescTxOne":
      " Su {n} transacción conserva su historial pero queda sin categoría.",

    "categories.newTitle": "Nueva categoría",
    "categories.editTitle": "Editar categoría",
    "categories.newDesc":
      "Dale a tus transacciones un lugar claro e identificado por color.",
    "categories.editDesc":
      "Actualiza el nombre, tipo, ícono y color de esta categoría.",

    "categories.type": "Tipo",
    "categories.name": "Nombre",
    "categories.parent": "Categoría principal",
    "categories.parentHint": "Conviértela en subcategoría de otra.",
    "categories.noParent": "Ninguna (nivel superior)",
    "categories.icon": "Ícono",
    "categories.color": "Color",
    "categories.namePlaceholder": "ej. Supermercado",
    "categories.previewName": "Nombre de categoría",
    "categories.errName": "Ingresa un nombre de categoría",
  },
  en: {
    "categories.eyebrow": "Organize",
    "categories.description":
      "Group your income and spending so every transaction tells a clear story.",
    "categories.add": "Add category",
    "categories.translate": "Translate with AI",
    "categories.translateTitle": "Translate categories to {lang}?",
    "categories.translateBody":
      "AI will translate your category names to {lang}. It's reversible (you can translate back to the other language).",
    "categories.translated": "{n} categories translated",
    "categories.translateNoop": "Your categories are already in {lang}",
    "categories.translateError": "Couldn't translate. {error}",
    "categories.create": "Create category",

    "categories.groupTransfer": "Transfers",
    "categories.count": "{n} categories",
    "categories.countOne": "{n} category",
    "categories.txCount": "{n} transactions",
    "categories.txCountOne": "{n} transaction",

    "categories.archived": "Archived",
    "categories.archive": "Archive",
    "categories.restore": "Restore",
    "categories.rowActions": "Actions for {name}",
    "categories.addKind": "Add {kind} category",
    "categories.emptyTitle": "No {kind} categories",
    "categories.emptyDesc":
      "Add your first {kind} category to start organizing.",

    "categories.toastCreated": "Category created",
    "categories.toastUpdated": "Category updated",
    "categories.toastArchived": "Category archived",
    "categories.toastRestored": "Category restored",
    "categories.toastDeleted": "Category deleted",

    "categories.deleteTitle": "Delete category?",
    "categories.deleteDesc": "\"{name}\" will be permanently removed.",
    "categories.deleteDescTx":
      " Its {n} transactions keep their history but become uncategorized.",
    "categories.deleteDescTxOne":
      " Its {n} transaction keep their history but become uncategorized.",

    "categories.newTitle": "New category",
    "categories.editTitle": "Edit category",
    "categories.newDesc": "Give your transactions a clear, color-coded home.",
    "categories.editDesc":
      "Update this category's name, type, icon, and color.",

    "categories.type": "Type",
    "categories.name": "Name",
    "categories.parent": "Parent category",
    "categories.parentHint": "Make it a sub-category of another.",
    "categories.noParent": "None (top level)",
    "categories.icon": "Icon",
    "categories.color": "Color",
    "categories.namePlaceholder": "e.g. Groceries",
    "categories.previewName": "Category name",
    "categories.errName": "Enter a category name",
  },
};
