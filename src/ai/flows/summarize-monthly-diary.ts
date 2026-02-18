'use server';
/**
 * @fileOverview A Genkit flow for summarizing monthly diary entries.
 *
 * - summarizeMonthlyDiary - A function that generates a summary of daily diary entries for a given month.
 * - SummarizeMonthlyDiaryInput - The input type for the summarizeMonthlyDiary function.
 * - SummarizeMonthlyDiaryOutput - The return type for the summarizeMonthlyDiary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyDiaryEntrySchema = z.object({
  date: z.string().describe('The date of the diary entry (e.g., "2023-10-26").'),
  whatIDidToday: z.string().describe('A summary of what was done today.'),
  whatILearned: z.string().describe('A summary of what was learned today.'),
  challengesBlockers: z.string().describe('Any challenges or blockers encountered today.'),
  tomorrowsPlan: z.string().describe('The plan for tomorrow.'),
  mood: z.string().describe('The mood for the day (e.g., emoji or scale).'),
});

const SummarizeMonthlyDiaryInputSchema = z.object({
  monthYear: z.string().describe('The month and year for which to summarize diary entries (e.g., "October 2023").'),
  diaryEntries: z.array(DailyDiaryEntrySchema).describe('An array of daily diary entries for the specified month.'),
});
export type SummarizeMonthlyDiaryInput = z.infer<typeof SummarizeMonthlyDiaryInputSchema>;

const SummarizeMonthlyDiaryOutputSchema = z.object({
  keyThemes: z.string().describe('A concise summary of the main themes and recurring topics across the month.'),
  learnings: z.string().describe('A summary of the key lessons, skills, or insights gained during the month.'),
  challenges: z.string().describe('A summary of the significant challenges or blockers faced throughout the month.'),
  moodTrends: z.string().describe('An analysis of the overall mood trends, including shifts or prevalent emotions.'),
  overallReflection: z.string().describe('An overall reflection or conclusion for the month.'),
});
export type SummarizeMonthlyDiaryOutput = z.infer<typeof SummarizeMonthlyDiaryOutputSchema>;

export async function summarizeMonthlyDiary(input: SummarizeMonthlyDiaryInput): Promise<SummarizeMonthlyDiaryOutput> {
  return summarizeMonthlyDiaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMonthlyDiaryPrompt',
  input: { schema: SummarizeMonthlyDiaryInputSchema },
  output: { schema: SummarizeMonthlyDiaryOutputSchema },
  prompt: `You are an AI assistant specialized in analyzing and summarizing personal diary entries.

Your task is to summarize the daily diary entries for the month of {{{monthYear}}}. Read through all entries and provide a concise summary that extracts the following:

1.  **Key Themes:** What are the main topics or recurring subjects that appeared in the diary entries?
2.  **Learnings:** What are the significant lessons, skills, or insights the user gained throughout the month?
3.  **Challenges:** What were the primary challenges or blockers the user faced during this month?
4.  **Mood Trends:** Describe the overall mood trends. Were there specific periods of high or low mood? What were the prevalent emotions?
5.  **Overall Reflection:** Provide a brief overall reflection or conclusion based on the month's activities and reflections.

Here are the daily diary entries for {{{monthYear}}}:

{{#each diaryEntries}}
Date: {{{date}}}
What I Did Today: {{{whatIDidToday}}}
What I Learned: {{{whatILearned}}}
Challenges/Blockers: {{{challengesBlockers}}}
Tomorrow's Plan: {{{tomorrowsPlan}}}
Mood: {{{mood}}}
---
{{/each}}

Please ensure the output is well-structured, clear, and adheres to the specified output schema.
`,
});

const summarizeMonthlyDiaryFlow = ai.defineFlow(
  {
    name: 'summarizeMonthlyDiaryFlow',
    inputSchema: SummarizeMonthlyDiaryInputSchema,
    outputSchema: SummarizeMonthlyDiaryOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
