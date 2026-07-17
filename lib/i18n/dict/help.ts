import type { Dict } from './_types';

/** Per-page guided tutorials (help affordance). Keys are prefixed with "help.". */
export const help: Dict = {
  es: {
    'help.pageTour': 'Ver tutorial de esta página',
    'help.tutorialsTitle': 'Tutoriales por página',
    'help.tutorialsHint': 'Repasa las funciones clave de cualquier página.',

    // ---- dashboard / panel ----
    'help.dashboard.s1.title': 'Tu panel',
    'help.dashboard.s1.body':
      'Un vistazo rápido a tu mes: ingresos, gastos, patrimonio y metas, todo en un solo lugar.',
    'help.dashboard.s2.title': 'Indicadores del mes',
    'help.dashboard.s2.body':
      'Ingresos, gastos, flujo neto y lo que te queda por presupuestar, actualizados al instante.',
    'help.dashboard.s3.title': 'Patrimonio neto',
    'help.dashboard.s3.body': 'Tus activos menos tus pasivos y cómo evolucionan con el tiempo.',
    'help.dashboard.s4.title': 'Explora a tu ritmo',
    'help.dashboard.s4.body':
      'Usa el menú para entrar a cada sección. Toca el icono de ayuda en cualquier página para ver su tutorial.',

    // ---- accounts / cuentas ----
    'help.accounts.s1.title': 'Tus cuentas',
    'help.accounts.s1.body':
      'Aquí registras todas tus cuentas y ves cómo suman tu patrimonio neto.',
    'help.accounts.s2.title': 'Resumen de saldos',
    'help.accounts.s2.body':
      'Patrimonio neto, activos y pasivos calculados a partir de tus cuentas.',
    'help.accounts.s3.title': 'Agregar una cuenta',
    'help.accounts.s3.body':
      'Registra una cuenta corriente, de ahorros, de crédito o de inversión.',

    // ---- transactions / transacciones ----
    'help.transactions.s1.title': 'Tus movimientos',
    'help.transactions.s1.body': 'El historial completo de tus ingresos, gastos y transferencias.',
    'help.transactions.s2.title': 'Registrar un movimiento',
    'help.transactions.s2.body':
      'Agrega ingresos, gastos o transferencias con categoría, cuenta y fecha.',
    'help.transactions.s3.title': 'Buscar y filtrar',
    'help.transactions.s3.body':
      'Filtra por texto, cuenta, categoría, tipo o rango de fechas para encontrar cualquier movimiento.',

    // ---- categories / categorías ----
    'help.categories.s1.title': 'Tus categorías',
    'help.categories.s1.body':
      'Organiza tus ingresos y gastos en categorías para presupuestar y ver reportes.',
    'help.categories.s2.title': 'Crear una categoría',
    'help.categories.s2.body':
      'Agrega categorías con su icono y color, y anídalas como subcategorías.',
    'help.categories.s3.title': 'Ingresos y gastos',
    'help.categories.s3.body':
      'Tus categorías se agrupan por tipo. Cada una muestra cuántos movimientos tiene.',

    // ---- budgets / presupuestos ----
    'help.budgets.s1.title': 'Tus presupuestos',
    'help.budgets.s1.body':
      'Define cuánto planeas gastar por categoría cada mes y sigue tu avance.',
    'help.budgets.s2.title': 'Mes y acciones',
    'help.budgets.s2.body':
      'Cambia de mes, agrega un presupuesto o copia los del mes anterior con un clic.',
    'help.budgets.s3.title': 'Avance del mes',
    'help.budgets.s3.body':
      'Cuánto llevas gastado frente a lo presupuestado y cuánto te queda disponible.',

    // ---- goals / metas ----
    'help.goals.s1.title': 'Tus metas',
    'help.goals.s1.body': 'Ahorra para lo que importa y sigue el avance de cada meta.',
    'help.goals.s2.title': 'Progreso total',
    'help.goals.s2.body': 'Lo ahorrado frente a lo que te propusiste, con tu avance general.',
    'help.goals.s3.title': 'Crear una meta',
    'help.goals.s3.body':
      'Define un monto objetivo y una fecha, y vincúlala a una cuenta de ahorro.',

    // ---- recurring / recurrentes ----
    'help.recurring.s1.title': 'Movimientos recurrentes',
    'help.recurring.s1.body':
      'Administra suscripciones y pagos que se repiten sin volver a capturarlos.',
    'help.recurring.s2.title': 'Cuánto se repite',
    'help.recurring.s2.body':
      'Tu gasto mensual recurrente, el costo de tus suscripciones y cuántas reglas tienes activas.',
    'help.recurring.s3.title': 'Crear una regla',
    'help.recurring.s3.body':
      'Define monto, frecuencia y categoría; Ample registra el movimiento cuando toca.',

    // ---- debts / deudas ----
    'help.debts.s1.title': 'Tus deudas',
    'help.debts.s1.body':
      'Lleva el control de lo que te deben y lo que debes, y registra los pagos.',
    'help.debts.s2.title': 'Tu posición',
    'help.debts.s2.body': 'Total que te deben, total que debes y tu posición neta de un vistazo.',
    'help.debts.s3.title': 'Agregar una deuda',
    'help.debts.s3.body': 'Registra un préstamo por cobrar o por pagar con su contraparte y monto.',

    // ---- reports / reportes ----
    'help.reports.s1.title': 'Tus reportes',
    'help.reports.s1.body':
      'Analiza tus finanzas con gráficos de tendencia, flujo y gasto por categoría.',
    'help.reports.s2.title': 'Rango de tiempo',
    'help.reports.s2.body':
      'Ajusta el periodo (mes, trimestre, año o lo que va del año) para todos los reportes.',
    'help.reports.s3.title': 'Resumen del periodo',
    'help.reports.s3.body':
      'Ingresos, gastos, flujo neto y tu tasa de ahorro para el rango elegido.',
    'help.reports.s4.title': 'Gráficos a detalle',
    'help.reports.s4.body':
      'Tendencia del patrimonio, comparación de ingresos y gastos y desglose por categoría.',

    // ---- settings / ajustes ----
    'help.settings.s1.title': 'Ajustes',
    'help.settings.s1.body': 'Personaliza Ample: moneda, idioma, apariencia, IA y tus datos.',
    'help.settings.s2.title': 'Preferencias generales',
    'help.settings.s2.body':
      'Nombre, moneda base, idioma, formato de fecha y opciones de apariencia.',
    'help.settings.s3.title': 'Asistente de IA',
    'help.settings.s3.body':
      'Opcional. Activa a Amp con tu propio proveedor y clave para resúmenes, consejos y chat.',
    'help.settings.s4.title': 'Recorridos y tutoriales',
    'help.settings.s4.body':
      'Repite el tour de bienvenida o abre el tutorial de cualquier página cuando quieras.',
  },
  en: {
    'help.pageTour': "View this page's tutorial",
    'help.tutorialsTitle': 'Page tutorials',
    'help.tutorialsHint': 'Revisit the key features of any page.',

    // ---- dashboard ----
    'help.dashboard.s1.title': 'Your dashboard',
    'help.dashboard.s1.body':
      'A quick look at your month: income, spending, net worth and goals, all in one place.',
    'help.dashboard.s2.title': "This month's numbers",
    'help.dashboard.s2.body':
      "Income, spending, net cash flow and what's left to budget, updated instantly.",
    'help.dashboard.s3.title': 'Net worth',
    'help.dashboard.s3.body': 'Your assets minus your liabilities, and how they trend over time.',
    'help.dashboard.s4.title': 'Explore at your pace',
    'help.dashboard.s4.body':
      'Use the menu to open each section. Tap the help icon on any page to see its tutorial.',

    // ---- accounts ----
    'help.accounts.s1.title': 'Your accounts',
    'help.accounts.s1.body': 'Track every account here and see how they add up to your net worth.',
    'help.accounts.s2.title': 'Balance summary',
    'help.accounts.s2.body': 'Net worth, assets and liabilities computed from your accounts.',
    'help.accounts.s3.title': 'Add an account',
    'help.accounts.s3.body': 'Track a checking, savings, credit or investment account.',

    // ---- transactions ----
    'help.transactions.s1.title': 'Your transactions',
    'help.transactions.s1.body': 'The full history of your income, expenses and transfers.',
    'help.transactions.s2.title': 'Record a movement',
    'help.transactions.s2.body':
      'Add income, expenses or transfers with a category, account and date.',
    'help.transactions.s3.title': 'Search and filter',
    'help.transactions.s3.body':
      'Filter by text, account, category, type or date range to find any movement.',

    // ---- categories ----
    'help.categories.s1.title': 'Your categories',
    'help.categories.s1.body':
      'Organize income and spending into categories to budget and power your reports.',
    'help.categories.s2.title': 'Create a category',
    'help.categories.s2.body':
      'Add categories with an icon and color, and nest them as subcategories.',
    'help.categories.s3.title': 'Income and expenses',
    'help.categories.s3.body':
      'Categories are grouped by type. Each one shows how many transactions it has.',

    // ---- budgets ----
    'help.budgets.s1.title': 'Your budgets',
    'help.budgets.s1.body':
      'Set how much you plan to spend per category each month and track your progress.',
    'help.budgets.s2.title': 'Month and actions',
    'help.budgets.s2.body': "Switch months, add a budget, or copy last month's in a single click.",
    'help.budgets.s3.title': "This month's progress",
    'help.budgets.s3.body':
      "How much you've spent against what you budgeted, and what's still available.",

    // ---- goals ----
    'help.goals.s1.title': 'Your goals',
    'help.goals.s1.body': 'Save for what matters and follow the progress of each goal.',
    'help.goals.s2.title': 'Overall progress',
    'help.goals.s2.body': "What you've saved against your targets, with your overall progress.",
    'help.goals.s3.title': 'Create a goal',
    'help.goals.s3.body': 'Set a target amount and date, and link it to a savings account.',

    // ---- recurring ----
    'help.recurring.s1.title': 'Recurring movements',
    'help.recurring.s1.body':
      'Manage subscriptions and repeating payments without re-entering them.',
    'help.recurring.s2.title': 'What repeats',
    'help.recurring.s2.body':
      'Your recurring monthly spend, subscription cost and how many active rules you have.',
    'help.recurring.s3.title': 'Create a rule',
    'help.recurring.s3.body':
      "Set amount, frequency and category; Ample records the movement when it's due.",

    // ---- debts ----
    'help.debts.s1.title': 'Your debts',
    'help.debts.s1.body': "Keep track of what you're owed and what you owe, and record payments.",
    'help.debts.s2.title': 'Your position',
    'help.debts.s2.body': 'Total owed to you, total you owe and your net position at a glance.',
    'help.debts.s3.title': 'Add a debt',
    'help.debts.s3.body': 'Record a receivable or a payable with its counterparty and amount.',

    // ---- reports ----
    'help.reports.s1.title': 'Your reports',
    'help.reports.s1.body':
      'Analyze your finances with trend, cash-flow and spending-by-category charts.',
    'help.reports.s2.title': 'Time range',
    'help.reports.s2.body':
      'Adjust the period (month, quarter, year or year-to-date) for every report.',
    'help.reports.s3.title': 'Period summary',
    'help.reports.s3.body':
      'Income, expenses, net cash flow and your savings rate for the chosen range.',
    'help.reports.s4.title': 'Detailed charts',
    'help.reports.s4.body':
      'Net-worth trend, income-vs-expense comparison and spending breakdown by category.',

    // ---- settings ----
    'help.settings.s1.title': 'Settings',
    'help.settings.s1.body': 'Make Ample yours: currency, language, appearance, AI and your data.',
    'help.settings.s2.title': 'General preferences',
    'help.settings.s2.body': 'Name, base currency, language, date format and appearance options.',
    'help.settings.s3.title': 'AI assistant',
    'help.settings.s3.body':
      'Optional. Turn on Amp with your own provider and key for summaries, tips and chat.',
    'help.settings.s4.title': 'Tours and tutorials',
    'help.settings.s4.body':
      "Replay the welcome tour or open any page's tutorial whenever you like.",
  },
};
