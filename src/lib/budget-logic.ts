import { getDaysInMonth } from 'date-fns';

export interface MonthlyConfig {
  totalBudget: number;
  month: number; // 0-11
  year: number;
  fixedExpenses: FixedExpense[];
  weekendExtra: number;
  holidayExtra: number;
  isWeekendEnabled: boolean;
  isHolidayEnabled: boolean;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  included: boolean;
}

export interface DailyReport {
  date: string;
  baseBudget: number;
  extraBudget: number;
  allowedBudget: number;
  spent: number;
  rollingBalance: number;
}

/**
 * Calculates the daily rolling budget based on spending.
 * Every day gets a base budget. 
 * If you spend less, it rolls to tomorrow.
 * Extra budgets (weekend/holiday) are added to the daily allowance but deducted from the monthly pool.
 */
export function calculateRollingBudget(
  config: MonthlyConfig,
  dailyExpenses: Record<string, number>, // date string (YYYY-MM-DD) -> total spent
  holidays: string[] // list of date strings (YYYY-MM-DD)
): Record<string, DailyReport> {
  const { totalBudget, month, year, fixedExpenses, weekendExtra, holidayExtra, isWeekendEnabled, isHolidayEnabled } = config;
  
  const daysInMonth = getDaysInMonth(new Date(year, month));
  const fixedIncludedTotal = fixedExpenses
    .filter(e => e.included)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const remainingBudget = totalBudget - fixedIncludedTotal;
  const dailyBase = remainingBudget / daysInMonth;
  
  let currentRollingBalance = 0;
  const reports: Record<string, DailyReport> = {};

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = holidays.includes(dateStr);
    
    let extra = 0;
    if (isWeekend && isWeekendEnabled) extra += weekendExtra;
    if (isHoliday && isHolidayEnabled) extra += holidayExtra;
    
    // The base daily budget + any carry forward from previous days
    const baseAllowance = dailyBase;
    const todayAllowance = baseAllowance + extra + currentRollingBalance;
    
    const spentToday = dailyExpenses[dateStr] || 0;
    const balanceAfterToday = todayAllowance - spentToday;
    
    reports[dateStr] = {
      date: dateStr,
      baseBudget: dailyBase,
      extraBudget: extra,
      allowedBudget: Math.max(0, todayAllowance),
      spent: spentToday,
      rollingBalance: balanceAfterToday
    };
    
    // Carry over for tomorrow
    currentRollingBalance = balanceAfterToday;
  }
  
  return reports;
}
