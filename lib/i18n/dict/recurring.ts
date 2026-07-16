import type { Dict } from "./_types";

// Filled during i18n rollout. Keys are prefixed with "recurring.".
export const recurring: Dict = {
  es: {
    "recurring.eyebrow": "Flujo de caja",
    "recurring.title": "Recurrentes",
    "recurring.description":
      "Facturas, suscripciones e ingresos recurrentes: siempre un paso adelante.",
    "recurring.add": "Agregar recurrente",

    "recurring.monthlyOut": "Salida recurrente mensual",
    "recurring.monthlyOutSub": "Facturas y suscripciones activas",
    "recurring.subsPerMonth": "Suscripciones / mes",
    "recurring.perYear": "/ año",
    "recurring.activeRecurring": "Recurrentes activos",
    "recurring.subsCount": "{n} suscripciones",

    "recurring.upcoming": "Próximos",
    "recurring.next30Days": "Próximos 30 días",
    "recurring.emptyUpcomingTitle": "Nada por vencer pronto",
    "recurring.emptyUpcomingDesc":
      "Las facturas y suscripciones que venzan en los próximos 30 días aparecerán aquí.",

    "recurring.allRecurring": "Todos los recurrentes",
    "recurring.rulesCount": "{n} reglas",
    "recurring.emptyRulesTitle": "Aún no hay recurrentes",
    "recurring.emptyRulesDesc":
      "Registra facturas, suscripciones e ingresos recurrentes para que nada se te escape.",

    "recurring.overdue": "Atrasado {n}d",
    "recurring.dueToday": "Vence hoy",
    "recurring.dueTomorrow": "Vence mañana",
    "recurring.dueInDays": "En {n} días",

    "recurring.subscription": "Suscripción",
    "recurring.postNow": "Registrar ahora",
    "recurring.posting": "Registrando…",
    "recurring.postedToast": "Se registró {name}",
    "recurring.postAria": "Registrar {name} ahora",
    "recurring.next": "próx. {date}",
    "recurring.deletedToast": "Regla recurrente eliminada",
    "recurring.activate": "Activar",
    "recurring.deactivate": "Desactivar",
    "recurring.moreActions": "Más acciones",
    "recurring.deleteTitle": "¿Eliminar regla recurrente?",
    "recurring.deleteDesc":
      "«{name}» se eliminará. Las transacciones ya registradas se conservan.",
    "recurring.perMonth": "/mes",

    "recurring.editTitle": "Editar recurrente",
    "recurring.newTitle": "Nuevo recurrente",
    "recurring.editDesc":
      "Actualiza esta factura, suscripción o ingreso recurrente.",
    "recurring.newDesc":
      "Programa una factura, suscripción o flujo de ingresos recurrente.",

    "recurring.name": "Nombre",
    "recurring.namePlaceholderIncome": "p. ej. Salario",
    "recurring.namePlaceholderExpense": "p. ej. Netflix, Alquiler",
    "recurring.nextDueDate": "Próxima fecha de vencimiento",
    "recurring.selectAccount": "Selecciona una cuenta",
    "recurring.frequency": "Frecuencia",
    "recurring.freq.daily": "Diario",
    "recurring.freq.weekly": "Semanal",
    "recurring.freq.biweekly": "Cada 2 semanas",
    "recurring.freq.monthly": "Mensual",
    "recurring.freq.quarterly": "Trimestral",
    "recurring.freq.yearly": "Anual",
    "recurring.every": "Cada",
    "recurring.everyHint": "Intervalo de repetición (1 = cada período)",
    "recurring.payee": "Beneficiario",
    "recurring.payeePlaceholderIncome": "Fuente del ingreso",
    "recurring.payeePlaceholderExpense": "¿Quién recibe el pago?",
    "recurring.subscriptionDesc": "Cuenta como gasto de suscripción",
    "recurring.autoPost": "Registro automático",
    "recurring.autoPostDesc": "Crear la transacción automáticamente",
    "recurring.notesPlaceholder": "Notas opcionales",

    "recurring.errName": "Ponle un nombre a este recurrente",
    "recurring.errAmount": "Ingresa un monto mayor que cero",
    "recurring.errAccount": "Elige una cuenta",
    "recurring.updatedToast": "Recurrente actualizado",
    "recurring.addedToast": "Recurrente agregado",

    "recurring.editAria": "Editar {name}",
    "recurring.tabEdit": "Editar",
    "recurring.tabHistory": "Movimientos",
    "recurring.historyDesc":
      "Transacciones generadas por este recurrente, automáticas o manuales. Revierte cualquiera para eliminarla.",
    "recurring.historyEmptyTitle": "Sin movimientos aún",
    "recurring.historyEmptyDesc":
      "Cuando este recurrente registre una transacción aparecerá aquí para poder revertirla.",
    "recurring.revert": "Revertir",
    "recurring.revertAria": "Revertir esta transacción",
    "recurring.revertTitle": "¿Revertir este movimiento?",
    "recurring.revertDesc":
      "Se eliminará la transacción generada. Si es la más reciente, el recurrente volverá a quedar pendiente para esa fecha.",
    "recurring.revertLast": "Revertir último",
    "recurring.revertLastTitle": "¿Revertir el último movimiento?",
    "recurring.revertLastDesc":
      "Se eliminará la última transacción generada por «{name}» y volverá a quedar pendiente para esa fecha.",
    "recurring.revertedToast": "Movimiento revertido",
    "recurring.nothingToRevert": "No hay movimientos por revertir",
  },
  en: {
    "recurring.eyebrow": "Cash flow",
    "recurring.title": "Recurring",
    "recurring.description":
      "Bills, subscriptions, and recurring income — always a step ahead.",
    "recurring.add": "Add recurring",

    "recurring.monthlyOut": "Monthly recurring out",
    "recurring.monthlyOutSub": "Active bills & subscriptions",
    "recurring.subsPerMonth": "Subscriptions / month",
    "recurring.perYear": "/ yr",
    "recurring.activeRecurring": "Active recurring",
    "recurring.subsCount": "{n} subscriptions",

    "recurring.upcoming": "Upcoming",
    "recurring.next30Days": "Next 30 days",
    "recurring.emptyUpcomingTitle": "Nothing due soon",
    "recurring.emptyUpcomingDesc":
      "Bills and subscriptions due in the next 30 days will appear here.",

    "recurring.allRecurring": "All recurring",
    "recurring.rulesCount": "{n} rules",
    "recurring.emptyRulesTitle": "No recurring items yet",
    "recurring.emptyRulesDesc":
      "Track bills, subscriptions, and recurring income so nothing slips through.",

    "recurring.overdue": "Overdue {n}d",
    "recurring.dueToday": "Due today",
    "recurring.dueTomorrow": "Due tomorrow",
    "recurring.dueInDays": "In {n} days",

    "recurring.subscription": "Subscription",
    "recurring.postNow": "Post now",
    "recurring.posting": "Posting…",
    "recurring.postedToast": "Posted {name}",
    "recurring.postAria": "Post {name} now",
    "recurring.next": "next {date}",
    "recurring.deletedToast": "Recurring rule deleted",
    "recurring.activate": "Activate",
    "recurring.deactivate": "Deactivate",
    "recurring.moreActions": "More actions",
    "recurring.deleteTitle": "Delete recurring rule?",
    "recurring.deleteDesc":
      "\"{name}\" will be removed. Posted transactions are kept.",
    "recurring.perMonth": "/mo",

    "recurring.editTitle": "Edit recurring",
    "recurring.newTitle": "New recurring",
    "recurring.editDesc":
      "Update this bill, subscription, or recurring income.",
    "recurring.newDesc":
      "Schedule a bill, subscription, or recurring income stream.",

    "recurring.name": "Name",
    "recurring.namePlaceholderIncome": "e.g. Salary",
    "recurring.namePlaceholderExpense": "e.g. Netflix, Rent",
    "recurring.nextDueDate": "Next due date",
    "recurring.selectAccount": "Select account",
    "recurring.frequency": "Frequency",
    "recurring.freq.daily": "Daily",
    "recurring.freq.weekly": "Weekly",
    "recurring.freq.biweekly": "Every 2 weeks",
    "recurring.freq.monthly": "Monthly",
    "recurring.freq.quarterly": "Quarterly",
    "recurring.freq.yearly": "Yearly",
    "recurring.every": "Every",
    "recurring.everyHint": "Repeat interval (1 = each period)",
    "recurring.payee": "Payee",
    "recurring.payeePlaceholderIncome": "Source of income",
    "recurring.payeePlaceholderExpense": "Who gets paid?",
    "recurring.subscriptionDesc": "Count toward subscription spend",
    "recurring.autoPost": "Auto-post",
    "recurring.autoPostDesc": "Create the transaction automatically",
    "recurring.notesPlaceholder": "Optional notes",

    "recurring.errName": "Give this recurring item a name",
    "recurring.errAmount": "Enter an amount greater than zero",
    "recurring.errAccount": "Choose an account",
    "recurring.updatedToast": "Recurring updated",
    "recurring.addedToast": "Recurring added",

    "recurring.editAria": "Edit {name}",
    "recurring.tabEdit": "Edit",
    "recurring.tabHistory": "Movements",
    "recurring.historyDesc":
      "Transactions generated by this recurring item, automatic or manual. Revert any one to delete it.",
    "recurring.historyEmptyTitle": "No movements yet",
    "recurring.historyEmptyDesc":
      "Once this recurring item posts a transaction it will show up here so you can revert it.",
    "recurring.revert": "Revert",
    "recurring.revertAria": "Revert this transaction",
    "recurring.revertTitle": "Revert this movement?",
    "recurring.revertDesc":
      "The generated transaction will be deleted. If it's the most recent one, the recurring item becomes due again for that date.",
    "recurring.revertLast": "Revert last",
    "recurring.revertLastTitle": "Revert the last movement?",
    "recurring.revertLastDesc":
      "The last transaction generated by \"{name}\" will be deleted and it will be due again for that date.",
    "recurring.revertedToast": "Movement reverted",
    "recurring.nothingToRevert": "Nothing to revert",
  },
};
