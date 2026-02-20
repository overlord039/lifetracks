
import { getDaysInMonth, startOfMonth, eachDayOfInterval, format } from 'date-fns';

export interface MonthlyConfig {
  totalBudget: number;
  month: number; // 0-11
  year: number;
  fixedExpenses: FixedExpense[];
  saturdayExtra: number;
  sundayExtra: number;
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
  carryForwardFromYesterday: number;
}

/**
 * Calculates the daily rolling budget based on spending.
 * Formula: todayBudget = dailyBase + carryForward + weekendBonus + holidayBonus
 */
export function calculateRollingBudget(
  config: MonthlyConfig,
  dailyExpenses: Record<string, number>, // date string (YYYY-MM-DD) -> total spent
  holidays: string[] = [] // list of date strings (YYYY-MM-DD)
): Record<string, DailyReport> {
  const { 
    totalBudget, 
    month, 
    year, 
    fixedExpenses, 
    saturdayExtra, 
    sundayExtra, 
    holidayExtra, 
    isWeekendEnabled, 
    isHolidayEnabled 
  } = config;
  
  const referenceDate = new Date(year, month, 1);
  const daysInMonthCount = getDaysInMonth(referenceDate);
  
  // Included Fixed Total
  const fixedIncludedTotal = fixedExpenses
    .filter(e => e.included)
    .reduce((sum, e) => sum + e.amount, 0);
  
  // Step 1: Remaining Budget for daily spending
  const remainingBudget = totalBudget - fixedIncludedTotal;
  
  // Step 2: Daily Base Budget
  const dailyBase = remainingBudget / daysInMonthCount;
  
  let currentRollingBalance = 0;
  const reports: Record<string, DailyReport> = {};

  // Generate all dates in the month
  const monthStart = startOfMonth(referenceDate);
  const days = eachDayOfInterval({ 
    start: monthStart, 
    end: new Date(year, month, daysInMonthCount) 
  });

  for (const date of days) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
    const isHoliday = holidays.includes(dateStr);
    
    let extra = 0;
    if (isWeekendEnabled) {
      if (dayOfWeek === 6) extra += saturdayExtra; // Sat
      if (dayOfWeek === 0) extra += sundayExtra;   // Sun
    }
    if (isHoliday && isHolidayEnabled) extra += holidayExtra;
    
    const yesterdayBalance = currentRollingBalance;
    
    // Formula: todayBudget = dailyBase + carryForward + weekendBonus
    const todayAllowance = dailyBase + yesterdayBalance + extra;
    
    const spentToday = dailyExpenses[dateStr] || 0;
    const balanceAfterToday = todayAllowance - spentToday;
    
    reports[dateStr] = {
      date: dateStr,
      baseBudget: dailyBase,
      extraBudget: extra,
      allowedBudget: todayAllowance, // Can be negative if overspent heavily
      spent: spentToday,
      rollingBalance: balanceAfterToday,
      carryForwardFromYesterday: yesterdayBalance
    };
    
    // Carry over for tomorrow
    currentRollingBalance = balanceAfterToday;
  }
  
  return reports;
}
