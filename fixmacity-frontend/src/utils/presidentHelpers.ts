// src/utils/presidentHelpers.ts

export interface PropositionForm {
  title_fr: string;
  description_fr?: string;
  start_date: string;
  end_date: string;
  status?: 'active' | 'closed' | 'archived';
}

/**
 * Validates proposition form values.
 * Returns an error string if invalid, or null if valid.
 */
export function validatePropositionForm(form: PropositionForm): string | null {
  if (!form.title_fr || form.title_fr.trim() === '') {
    return "Le titre en français est obligatoire.";
  }
  if (!form.start_date) {
    return "La date de début est obligatoire.";
  }
  if (!form.end_date) {
    return "La date de fin est obligatoire.";
  }
  const start = new Date(form.start_date);
  const end = new Date(form.end_date);
  if (isNaN(start.getTime())) {
    return "La date de début n'est pas valide.";
  }
  if (isNaN(end.getTime())) {
    return "La date de fin n'est pas valide.";
  }
  if (end < start) {
    return "La date de fin doit être postérieure ou égale à la date de début.";
  }
  return null;
}

/**
 * Computes monthly proposition counts for trend line chart.
 */
export function computeMonthlyTrend(propositions: any[], monthsLimit: number = 6) {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const result: { month: string; count: number }[] = [];
  const now = new Date();

  // Generate the last N months in chronological order
  for (let i = monthsLimit - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()] + ' ' + d.getFullYear().toString().slice(-2);
    result.push({ month: monthName, count: 0 });
  }

  // Group propositions by month and populate counts
  propositions.forEach(prop => {
    if (!prop.created_at) return;
    const date = new Date(prop.created_at);
    if (isNaN(date.getTime())) return;
    
    const monthName = months[date.getMonth()] + ' ' + date.getFullYear().toString().slice(-2);
    const found = result.find(r => r.month === monthName);
    if (found) {
      found.count += 1;
    }
  });

  return result;
}

/**
 * Computes the month-over-month percentage growth of propositions.
 */
export function computeGrowthRate(propositions: any[]): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();

  let currentMonthCount = 0;
  let prevMonthCount = 0;

  propositions.forEach(prop => {
    if (!prop.created_at) return;
    const date = new Date(prop.created_at);
    if (isNaN(date.getTime())) return;

    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      currentMonthCount++;
    } else if (date.getMonth() === prevMonth && date.getFullYear() === prevMonthYear) {
      prevMonthCount++;
    }
  });

  if (prevMonthCount === 0) {
    return currentMonthCount > 0 ? `+${currentMonthCount * 100}%` : "0%";
  }

  const rate = ((currentMonthCount - prevMonthCount) / prevMonthCount) * 100;
  const formatted = rate >= 0 ? `+${Math.round(rate)}%` : `${Math.round(rate)}%`;
  return formatted;
}
