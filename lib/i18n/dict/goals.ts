import type { Dict } from "./_types";

// Filled during i18n rollout. Keys are prefixed with "goals.".
export const goals: Dict = {
  es: {
    // page header
    "goals.eyebrow": "Ahorro",
    "goals.title": "Metas",
    "goals.description":
      "Convierte tus intenciones en logros: haz seguimiento de cada objetivo y observa cómo crece el impulso.",
    "goals.addGoal": "Agregar meta",

    // empty state
    "goals.emptyTitle": "Aún no tienes metas",
    "goals.emptyDescription":
      "Define tu primer objetivo de ahorro —un fondo de emergencia, un viaje, una compra grande— y Ample hará seguimiento de tu progreso.",
    "goals.createGoal": "Crear una meta",

    // summary strip
    "goals.totalSaved": "Total ahorrado",
    "goals.targetedSuffix": "como objetivo",
    "goals.progress": "Progreso",
    "goals.active": "Activas",
    "goals.completed": "Completadas",
    "goals.inProgress": "En curso",

    // card status badges
    "goals.statusActive": "Activa",
    "goals.statusPaused": "En pausa",
    "goals.statusCompleted": "Completada",
    "goals.statusArchived": "Archivada",

    // card body
    "goals.toGo": "por ahorrar",
    "goals.fullyFunded": "Financiada por completo",
    "goals.onTrackFor": "En camino para",
    "goals.perMonth": "/mes",
    "goals.forecastHint":
      "Agrega aportes para estimar una fecha de finalización",
    "goals.unlinked": "Sin cuenta",
    "goals.contribute": "Aportar",

    // card menu
    "goals.goalOptions": "Opciones de la meta",
    "goals.markComplete": "Marcar como completada",
    "goals.pause": "Pausar",
    "goals.resume": "Reanudar",
    "goals.reopen": "Reabrir",

    // card toasts
    "goals.toastCompleted": "Meta completada",
    "goals.toastPaused": "Meta pausada",
    "goals.toastResumed": "Meta reanudada",
    "goals.toastReopened": "Meta reabierta",
    "goals.toastDeleted": "Meta eliminada",

    // delete confirmation
    "goals.deleteTitle": "¿Eliminar «{name}»?",
    "goals.deleteDescription":
      "Esto elimina la meta y su historial de aportes de forma permanente. No se puede deshacer.",
    "goals.deleteGoal": "Eliminar meta",

    // goal dialog
    "goals.newTitle": "Nueva meta",
    "goals.editTitle": "Editar meta",
    "goals.newDescription":
      "Ponle nombre a un objetivo, define un monto y Ample hará seguimiento de tu progreso.",
    "goals.editDescription":
      "Actualiza el objetivo, el plazo o los detalles de esta meta.",

    // goal form
    "goals.errorName": "Ponle un nombre a tu meta",
    "goals.errorTarget": "Ingresa un objetivo mayor que cero",
    "goals.name": "Nombre de la meta",
    "goals.namePlaceholder": "p. ej. Fondo de emergencia",
    "goals.targetAmount": "Monto objetivo",
    "goals.alreadySaved": "Ya ahorrado",
    "goals.targetDate": "Fecha objetivo",
    "goals.linkedAccount": "Cuenta vinculada",
    "goals.linkedHint": "Dónde viven estos ahorros",
    "goals.noLinkedAccount": "Sin cuenta vinculada",
    "goals.appearance": "Apariencia",
    "goals.notesPlaceholder": "Notas opcionales",
    "goals.submitCreate": "Crear meta",
    "goals.toastCreated": "Meta creada",
    "goals.toastUpdated": "Meta actualizada",

    // contribute dialog
    "goals.errorAmount": "Ingresa un monto mayor que cero",
    "goals.toastWithdrawal": "Retiro registrado",
    "goals.toastContribution": "Aporte agregado",
    "goals.contributeTo": "Aportar a {name}",
    "goals.contributeDescription":
      "Registra el dinero que apartas para esta meta.",
    "goals.addFunds": "Agregar fondos",
    "goals.withdraw": "Retirar",
    "goals.fundRemaining": "Completar con",
    "goals.note": "Nota",
    "goals.notePlaceholder": "Opcional — p. ej. sueldo de septiembre",
    "goals.recordWithdrawal": "Registrar retiro",
    "goals.addContribution": "Agregar aporte",
  },
  en: {
    // page header
    "goals.eyebrow": "Savings",
    "goals.title": "Goals",
    "goals.description":
      "Turn intentions into milestones — track every target and watch the momentum build.",
    "goals.addGoal": "Add goal",

    // empty state
    "goals.emptyTitle": "No goals yet",
    "goals.emptyDescription":
      "Set your first savings target — an emergency fund, a trip, a big purchase — and Ample will track your progress toward it.",
    "goals.createGoal": "Create a goal",

    // summary strip
    "goals.totalSaved": "Total saved",
    "goals.targetedSuffix": "targeted",
    "goals.progress": "Progress",
    "goals.active": "Active",
    "goals.completed": "Completed",
    "goals.inProgress": "In progress",

    // card status badges
    "goals.statusActive": "Active",
    "goals.statusPaused": "Paused",
    "goals.statusCompleted": "Completed",
    "goals.statusArchived": "Archived",

    // card body
    "goals.toGo": "to go",
    "goals.fullyFunded": "Fully funded",
    "goals.onTrackFor": "On track for",
    "goals.perMonth": "/mo",
    "goals.forecastHint": "Add contributions to forecast a finish date",
    "goals.unlinked": "Unlinked",
    "goals.contribute": "Contribute",

    // card menu
    "goals.goalOptions": "Goal options",
    "goals.markComplete": "Mark complete",
    "goals.pause": "Pause",
    "goals.resume": "Resume",
    "goals.reopen": "Reopen",

    // card toasts
    "goals.toastCompleted": "Goal completed",
    "goals.toastPaused": "Goal paused",
    "goals.toastResumed": "Goal resumed",
    "goals.toastReopened": "Goal reopened",
    "goals.toastDeleted": "Goal deleted",

    // delete confirmation
    "goals.deleteTitle": "Delete “{name}”?",
    "goals.deleteDescription":
      "This permanently removes the goal and its contribution history. This can’t be undone.",
    "goals.deleteGoal": "Delete goal",

    // goal dialog
    "goals.newTitle": "New goal",
    "goals.editTitle": "Edit goal",
    "goals.newDescription":
      "Name a target, set an amount, and Ample will track your progress.",
    "goals.editDescription": "Update this goal's target, timeline, or details.",

    // goal form
    "goals.errorName": "Give your goal a name",
    "goals.errorTarget": "Enter a target greater than zero",
    "goals.name": "Goal name",
    "goals.namePlaceholder": "e.g. Emergency fund",
    "goals.targetAmount": "Target amount",
    "goals.alreadySaved": "Already saved",
    "goals.targetDate": "Target date",
    "goals.linkedAccount": "Linked account",
    "goals.linkedHint": "Where these savings live",
    "goals.noLinkedAccount": "No linked account",
    "goals.appearance": "Appearance",
    "goals.notesPlaceholder": "Optional notes",
    "goals.submitCreate": "Create goal",
    "goals.toastCreated": "Goal created",
    "goals.toastUpdated": "Goal updated",

    // contribute dialog
    "goals.errorAmount": "Enter an amount greater than zero",
    "goals.toastWithdrawal": "Withdrawal recorded",
    "goals.toastContribution": "Contribution added",
    "goals.contributeTo": "Contribute to {name}",
    "goals.contributeDescription": "Record money set aside toward this goal.",
    "goals.addFunds": "Add funds",
    "goals.withdraw": "Withdraw",
    "goals.fundRemaining": "Fund the remaining",
    "goals.note": "Note",
    "goals.notePlaceholder": "Optional — e.g. September paycheck",
    "goals.recordWithdrawal": "Record withdrawal",
    "goals.addContribution": "Add contribution",
  },
};
