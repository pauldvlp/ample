import type { Dict } from './_types';

// Dashboard feature strings. Shared vocabulary (net worth, assets, income,
// etc.) is pulled from the common namespace; only dashboard-specific copy
// lives here. Keys are prefixed with "dashboard.".
export const dashboard: Dict = {
  es: {
    'dashboard.greetingMorning': 'Buenos días',
    'dashboard.greetingAfternoon': 'Buenas tardes',
    'dashboard.greetingEvening': 'Buenas noches',
    'dashboard.description': 'Una vista serena y completa de cómo está tu dinero hoy.',

    'dashboard.incomeThisMonth': 'Ingresos · este mes',
    'dashboard.spendingThisMonth': 'Gastos · este mes',
    'dashboard.leftToBudget': 'Por presupuestar',
    'dashboard.savingsRateSub': '{pct} de ahorro',
    'dashboard.budgetUsedSub': '{pct} del presupuesto usado',

    'dashboard.spending': 'Gastos',
    'dashboard.spendingDesc': 'Este mes por categoría',
    'dashboard.incomeVsExpenses': 'Ingresos vs. gastos',
    'dashboard.last6Months': 'Últimos 6 meses',
    'dashboard.upcomingBills': 'Próximos pagos',
    'dashboard.next30Days': 'Próximos 30 días',
    'dashboard.recentActivity': 'Actividad reciente',
    'dashboard.budgetProgress': 'Progreso del presupuesto',

    'dashboard.noTransactions': 'Aún no hay transacciones',
    'dashboard.noTransactionsDesc': 'Agrega tu primera transacción para comenzar.',

    'dashboard.thisMonthInline': 'este mes',

    'dashboard.noSpending': 'Aún no hay gastos',
    'dashboard.noSpendingDesc': 'Los gastos de este mes se desglosarán aquí por categoría.',

    'dashboard.overdue': 'Vencido {n}d',
    'dashboard.dueToday': 'Vence hoy',
    'dashboard.dueTomorrow': 'Vence mañana',
    'dashboard.dueInDays': 'En {n} días',
    'dashboard.noBills': 'No hay pagos pendientes',
    'dashboard.noBillsDesc': 'Los cargos recurrentes de los próximos 30 días aparecerán aquí.',

    'dashboard.noGoals': 'No hay metas activas',
    'dashboard.noGoalsDesc': 'Define una meta de ahorro y observa cómo crece tu progreso.',
    'dashboard.createGoal': 'Crear una meta',

    'dashboard.spentThisMonth': 'Gastado este mes',
    'dashboard.noBudgets': 'No hay presupuestos',
    'dashboard.noBudgetsDesc': 'Crea presupuestos mensuales para mantener tus gastos bajo control.',
    'dashboard.setupBudgets': 'Configurar presupuestos',
  },
  en: {
    'dashboard.greetingMorning': 'Good morning',
    'dashboard.greetingAfternoon': 'Good afternoon',
    'dashboard.greetingEvening': 'Good evening',
    'dashboard.description': 'A calm, complete view of where your money stands today.',

    'dashboard.incomeThisMonth': 'Income · this month',
    'dashboard.spendingThisMonth': 'Spending · this month',
    'dashboard.leftToBudget': 'Left to budget',
    'dashboard.savingsRateSub': '{pct} savings rate',
    'dashboard.budgetUsedSub': '{pct} of budget used',

    'dashboard.spending': 'Spending',
    'dashboard.spendingDesc': 'This month by category',
    'dashboard.incomeVsExpenses': 'Income vs. expenses',
    'dashboard.last6Months': 'Last 6 months',
    'dashboard.upcomingBills': 'Upcoming bills',
    'dashboard.next30Days': 'Next 30 days',
    'dashboard.recentActivity': 'Recent activity',
    'dashboard.budgetProgress': 'Budget progress',

    'dashboard.noTransactions': 'No transactions yet',
    'dashboard.noTransactionsDesc': 'Add your first transaction to get started.',

    'dashboard.thisMonthInline': 'this month',

    'dashboard.noSpending': 'No spending yet',
    'dashboard.noSpendingDesc': 'Expenses this month will break down here by category.',

    'dashboard.overdue': 'Overdue {n}d',
    'dashboard.dueToday': 'Due today',
    'dashboard.dueTomorrow': 'Due tomorrow',
    'dashboard.dueInDays': 'In {n} days',
    'dashboard.noBills': 'No bills due',
    'dashboard.noBillsDesc': 'Upcoming recurring charges in the next 30 days will show here.',

    'dashboard.noGoals': 'No active goals',
    'dashboard.noGoalsDesc': 'Set a savings target and watch your progress build.',
    'dashboard.createGoal': 'Create a goal',

    'dashboard.spentThisMonth': 'Spent this month',
    'dashboard.noBudgets': 'No budgets set',
    'dashboard.noBudgetsDesc': 'Create monthly budgets to keep spending on track.',
    'dashboard.setupBudgets': 'Set up budgets',
  },
};
