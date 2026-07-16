import type { Dict } from "./_types";

// Filled during i18n rollout. Keys are prefixed with "transactions.".
export const transactions: Dict = {
  es: {
    "transactions.eyebrow": "Libro contable",
    "transactions.description": "Cada entrada y salida, en un libro claro y ordenado.",
    "transactions.new": "Nueva transacción",

    // Filters
    "transactions.searchPlaceholder": "Buscar beneficiario o notas…",
    "transactions.searchAria": "Buscar transacciones",
    "transactions.clearSearchAria": "Limpiar búsqueda",
    "transactions.allAccounts": "Todas las cuentas",
    "transactions.allCategories": "Todas las categorías",
    "transactions.allTypes": "Todos los tipos",
    "transactions.fromDateAria": "Fecha desde",
    "transactions.toDateAria": "Fecha hasta",
    "transactions.fromDate": "Desde",
    "transactions.toDate": "Hasta",

    // View summary + list
    "transactions.none": "Sin transacciones",
    "transactions.countOne": "{n} transacción",
    "transactions.countMany": "{n} transacciones",
    "transactions.in": "Entradas",
    "transactions.out": "Salidas",
    "transactions.transaction": "Transacción",
    "transactions.toAccount": "A {name}",
    "transactions.fromAccount": "De {name}",
    "transactions.accountFallback": "cuenta",

    // Row actions + delete confirm
    "transactions.editAria": "Editar transacción",
    "transactions.deleteAria": "Eliminar transacción",
    "transactions.deleteTitle": "¿Eliminar transacción?",
    "transactions.deleteDesc": "Esto elimina la transacción de forma permanente. No se puede deshacer.",
    "transactions.toastDeleted": "Transacción eliminada",

    // Pagination
    "transactions.prev": "Anterior",
    "transactions.next": "Siguiente",
    "transactions.showing": "Mostrando {a}–{b} de {total}",
    "transactions.pageOf": "Página {p} de {n}",

    // Empty states
    "transactions.emptyFilteredTitle": "No hay transacciones que coincidan",
    "transactions.emptyFilteredDesc": "Prueba a ajustar o limpiar los filtros para ver más.",
    "transactions.emptyTitle": "Aún no hay transacciones",
    "transactions.emptyDesc": "Registra tu primera transacción para empezar tu libro.",
    "transactions.clearFilters": "Limpiar filtros",

    // Form labels
    "transactions.fromAccountLabel": "Cuenta de origen",
    "transactions.toAccountLabel": "Cuenta de destino",
    "transactions.descriptionLabel": "Descripción",
    "transactions.payee": "Beneficiario",
    "transactions.tags": "Etiquetas",

    // Form placeholders
    "transactions.selectAccount": "Selecciona una cuenta",
    "transactions.destination": "Destino",
    "transactions.payeePlaceholderIncome": "Fuente del ingreso",
    "transactions.payeePlaceholderTransfer": "p. ej. Ahorro mensual",
    "transactions.payeePlaceholderExpense": "¿En qué se gastó el dinero?",
    "transactions.addTagPlaceholder": "Agregar etiqueta…",
    "transactions.notesPlaceholder": "Notas opcionales",

    // Form buttons + toasts
    "transactions.add": "Agregar transacción",
    "transactions.toastAdded": "Transacción agregada",
    "transactions.toastUpdated": "Transacción actualizada",
    "transactions.errAmount": "Ingresa un monto mayor que cero",
    "transactions.errAccount": "Elige una cuenta",
    "transactions.errDestination": "Elige una cuenta de destino diferente",

    // Dialog titles + descriptions
    "transactions.editTitle": "Editar transacción",
    "transactions.editDesc": "Actualiza los detalles de esta transacción.",
    "transactions.newDesc": "Registra un ingreso, un gasto o una transferencia entre cuentas.",
  },
  en: {
    "transactions.eyebrow": "Ledger",
    "transactions.description": "Every inflow and outflow, in one calm ledger.",
    "transactions.new": "New transaction",

    // Filters
    "transactions.searchPlaceholder": "Search payee or notes…",
    "transactions.searchAria": "Search transactions",
    "transactions.clearSearchAria": "Clear search",
    "transactions.allAccounts": "All accounts",
    "transactions.allCategories": "All categories",
    "transactions.allTypes": "All types",
    "transactions.fromDateAria": "From date",
    "transactions.toDateAria": "To date",
    "transactions.fromDate": "From",
    "transactions.toDate": "To",

    // View summary + list
    "transactions.none": "No transactions",
    "transactions.countOne": "{n} transaction",
    "transactions.countMany": "{n} transactions",
    "transactions.in": "In",
    "transactions.out": "Out",
    "transactions.transaction": "Transaction",
    "transactions.toAccount": "To {name}",
    "transactions.fromAccount": "From {name}",
    "transactions.accountFallback": "account",

    // Row actions + delete confirm
    "transactions.editAria": "Edit transaction",
    "transactions.deleteAria": "Delete transaction",
    "transactions.deleteTitle": "Delete transaction?",
    "transactions.deleteDesc": "This permanently removes the transaction. This can't be undone.",
    "transactions.toastDeleted": "Transaction deleted",

    // Pagination
    "transactions.prev": "Prev",
    "transactions.next": "Next",
    "transactions.showing": "Showing {a}–{b} of {total}",
    "transactions.pageOf": "Page {p} of {n}",

    // Empty states
    "transactions.emptyFilteredTitle": "No matching transactions",
    "transactions.emptyFilteredDesc": "Try adjusting or clearing your filters to see more.",
    "transactions.emptyTitle": "No transactions yet",
    "transactions.emptyDesc": "Record your first transaction to start building your ledger.",
    "transactions.clearFilters": "Clear filters",

    // Form labels
    "transactions.fromAccountLabel": "From account",
    "transactions.toAccountLabel": "To account",
    "transactions.descriptionLabel": "Description",
    "transactions.payee": "Payee",
    "transactions.tags": "Tags",

    // Form placeholders
    "transactions.selectAccount": "Select account",
    "transactions.destination": "Destination",
    "transactions.payeePlaceholderIncome": "Source of income",
    "transactions.payeePlaceholderTransfer": "e.g. Monthly savings",
    "transactions.payeePlaceholderExpense": "Where did the money go?",
    "transactions.addTagPlaceholder": "Add a tag…",
    "transactions.notesPlaceholder": "Optional notes",

    // Form buttons + toasts
    "transactions.add": "Add transaction",
    "transactions.toastAdded": "Transaction added",
    "transactions.toastUpdated": "Transaction updated",
    "transactions.errAmount": "Enter an amount greater than zero",
    "transactions.errAccount": "Choose an account",
    "transactions.errDestination": "Choose a different destination account",

    // Dialog titles + descriptions
    "transactions.editTitle": "Edit transaction",
    "transactions.editDesc": "Update the details of this transaction.",
    "transactions.newDesc": "Record income, an expense, or a transfer between accounts.",
  },
};
