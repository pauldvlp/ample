import type { Dict } from './_types';

// Filled during i18n rollout. Keys are prefixed with "accounts.".
export const accounts: Dict = {
  es: {
    'accounts.eyebrow': 'Saldos',
    'accounts.description': 'Todas las cuentas que registras y cómo suman tu patrimonio neto.',
    'accounts.add': 'Agregar cuenta',

    'accounts.netWorthSub': 'Activos menos pasivos',
    'accounts.assetsSub': 'Lo que tienes',
    'accounts.liabilitiesSub': 'Lo que debes',

    'accounts.countOne': '{n} cuenta',
    'accounts.countMany': '{n} cuentas',

    'accounts.emptyTitle': 'Aún no hay cuentas',
    'accounts.emptyDesc':
      'Agrega tu primera cuenta para empezar a registrar saldos y construir tu patrimonio neto.',

    'accounts.viewTransactions': 'Ver transacciones de {name}',
    'accounts.offNetWorth': 'Fuera del patrimonio',
    'accounts.actions': 'Acciones de la cuenta',
    'accounts.archive': 'Archivar',
    'accounts.restore': 'Restaurar',
    'accounts.used': '{pct} usado',
    'accounts.limit': 'Límite',

    'accounts.toastRestored': 'Cuenta restaurada',
    'accounts.toastArchived': 'Cuenta archivada',
    'accounts.toastDeleted': 'Cuenta eliminada',

    'accounts.deleteTitle': '¿Eliminar cuenta?',
    'accounts.deleteDesc':
      '«{name}» y todas sus transacciones se eliminarán de forma permanente. Esta acción no se puede deshacer.',
    'accounts.deleteConfirm': 'Eliminar cuenta',
    'accounts.deleteTypeName': 'Escribe «{name}» para confirmar',

    'accounts.newTitle': 'Nueva cuenta',
    'accounts.editTitle': 'Editar cuenta',
    'accounts.newDesc': 'Registra una cuenta corriente, de ahorros, de crédito o de inversión.',
    'accounts.editDesc': 'Actualiza los datos de esta cuenta.',

    'accounts.errName': 'Ponle un nombre a la cuenta',
    'accounts.errStartingBalance': 'Ingresa un saldo inicial válido',
    'accounts.errCreditLimit': 'Ingresa un límite de crédito válido',
    'accounts.toastUpdated': 'Cuenta actualizada',
    'accounts.toastAdded': 'Cuenta agregada',

    'accounts.fieldName': 'Nombre',
    'accounts.namePlaceholder': 'Ej. Cuenta corriente diaria',
    'accounts.fieldType': 'Tipo',
    'accounts.typePlaceholder': 'Tipo de cuenta',
    'accounts.fieldCurrency': 'Moneda',
    'accounts.currencyPlaceholder': 'Moneda',
    'accounts.fieldInstitution': 'Institución',
    'accounts.institutionPlaceholder': 'Ej. Banco Nacional',
    'accounts.fieldStartingBalance': 'Saldo inicial',
    'accounts.startingBalanceHint': 'Puede ser negativo para préstamos o crédito.',
    'accounts.fieldCreditLimit': 'Límite de crédito',
    'accounts.creditLimitHint': 'Se usa para calcular la utilización.',
    'accounts.fieldIconColor': 'Icono y color',
    'accounts.includeInNetWorth': 'Incluir en el patrimonio neto',
    'accounts.includeInNetWorthDesc': 'Suma esta cuenta a tu patrimonio neto total.',
    'accounts.notesPlaceholder': 'Notas opcionales',

    'accounts.type.checking': 'Cuenta corriente',
    'accounts.type.savings': 'Ahorros',
    'accounts.type.cash': 'Efectivo',
    'accounts.type.investment': 'Inversión',
    'accounts.type.credit': 'Tarjeta de crédito',
    'accounts.type.loan': 'Préstamo',
    'accounts.type.other': 'Otro',
  },
  en: {
    'accounts.eyebrow': 'Balances',
    'accounts.description': 'Every account you track, and how they add up to your net worth.',
    'accounts.add': 'Add account',

    'accounts.netWorthSub': 'Assets minus liabilities',
    'accounts.assetsSub': 'What you own',
    'accounts.liabilitiesSub': 'What you owe',

    'accounts.countOne': '{n} account',
    'accounts.countMany': '{n} accounts',

    'accounts.emptyTitle': 'No accounts yet',
    'accounts.emptyDesc':
      'Add your first account to start tracking balances and building your net worth.',

    'accounts.viewTransactions': 'View {name} transactions',
    'accounts.offNetWorth': 'Off net worth',
    'accounts.actions': 'Account actions',
    'accounts.archive': 'Archive',
    'accounts.restore': 'Restore',
    'accounts.used': '{pct} used',
    'accounts.limit': 'Limit',

    'accounts.toastRestored': 'Account restored',
    'accounts.toastArchived': 'Account archived',
    'accounts.toastDeleted': 'Account deleted',

    'accounts.deleteTitle': 'Delete account?',
    'accounts.deleteDesc':
      '"{name}" and all of its transactions will be permanently removed. This cannot be undone.',
    'accounts.deleteConfirm': 'Delete account',
    'accounts.deleteTypeName': 'Type “{name}” to confirm',

    'accounts.newTitle': 'New account',
    'accounts.editTitle': 'Edit account',
    'accounts.newDesc': 'Track a checking, savings, credit, or investment account.',
    'accounts.editDesc': 'Update the details of this account.',

    'accounts.errName': 'Give the account a name',
    'accounts.errStartingBalance': 'Enter a valid starting balance',
    'accounts.errCreditLimit': 'Enter a valid credit limit',
    'accounts.toastUpdated': 'Account updated',
    'accounts.toastAdded': 'Account added',

    'accounts.fieldName': 'Name',
    'accounts.namePlaceholder': 'e.g. Everyday Checking',
    'accounts.fieldType': 'Type',
    'accounts.typePlaceholder': 'Account type',
    'accounts.fieldCurrency': 'Currency',
    'accounts.currencyPlaceholder': 'Currency',
    'accounts.fieldInstitution': 'Institution',
    'accounts.institutionPlaceholder': 'e.g. First National',
    'accounts.fieldStartingBalance': 'Starting balance',
    'accounts.startingBalanceHint': 'Can be negative for loans or credit.',
    'accounts.fieldCreditLimit': 'Credit limit',
    'accounts.creditLimitHint': 'Used for utilization.',
    'accounts.fieldIconColor': 'Icon & color',
    'accounts.includeInNetWorth': 'Include in net worth',
    'accounts.includeInNetWorthDesc': 'Count this account toward your total net worth.',
    'accounts.notesPlaceholder': 'Optional notes',

    'accounts.type.checking': 'Checking',
    'accounts.type.savings': 'Savings',
    'accounts.type.cash': 'Cash',
    'accounts.type.investment': 'Investment',
    'accounts.type.credit': 'Credit card',
    'accounts.type.loan': 'Loan',
    'accounts.type.other': 'Other',
  },
};
