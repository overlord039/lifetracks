'use server';
/**
 * @fileOverview An AI agent that categorizes expenses based on a description and existing categories.
 *
 * - categorizeExpense - A function that handles the expense categorization process.
 * - CategorizeExpenseInput - The input type for the categorizeExpense function.
 * - CategorizeExpenseOutput - The return type for the categorizeExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CategorizeExpenseInputSchema = z.object({
  expenseDescription: z.string().describe('The detailed description of the expense.'),
  existingCategories: z
    .array(z.string())
    .describe('A list of existing expense categories defined by the user.'),
});
export type CategorizeExpenseInput = z.infer<typeof CategorizeExpenseInputSchema>;

const CategorizeExpenseOutputSchema = z.object({
  suggestedCategoryName:
    z.string().describe('The name of the suggested category. This can be one of the existing categories or a new category if none fit.'),
  isNewCategorySuggested:
    z.boolean().describe('True if a new category is suggested, false if the suggested category is from the existing list.'),
  reasoning: z.string().describe('A brief explanation for the categorization decision.'),
});
export type CategorizeExpenseOutput = z.infer<typeof CategorizeExpenseOutputSchema>;

export async function categorizeExpense(input: CategorizeExpenseInput): Promise<CategorizeExpenseOutput> {
  return categorizeExpenseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'categorizeExpensePrompt',
  input: {schema: CategorizeExpenseInputSchema},
  output: {schema: CategorizeExpenseOutputSchema},
  prompt: `You are an intelligent assistant designed to categorize expenses.
Your task is to analyze an expense description and assign it to the most appropriate category from a given list of existing categories.
If none of the existing categories seem to fit well, you should suggest a new, fitting category.

Existing Categories:
{{#if existingCategories}}
  {{#each existingCategories}}- {{{this}}}
  {{/each}}
{{else}}
  No existing categories provided.
{{/if}}

Expense Description: {{{expenseDescription}}}

Based on the expense description and the existing categories, please provide:
1. The most suitable category name.
2. A boolean indicating if this is a new suggested category (true) or an existing one (false).
3. A brief reasoning for your choice.

Example of expected JSON output if an existing category fits:
{
  "suggestedCategoryName": "Groceries",
  "isNewCategorySuggested": false,
  "reasoning": "The expense clearly describes buying food items for home."
}

Example of expected JSON output if a new category is suggested:
{
  "suggestedCategoryName": "Online Subscriptions",
  "isNewCategorySuggested": true,
  "reasoning": "The expense describes a monthly payment for a streaming service, which does not fit existing categories like 'Entertainment' or 'Utilities'."
}
`,
});

const categorizeExpenseFlow = ai.defineFlow(
  {
    name: 'categorizeExpenseFlow',
    inputSchema: CategorizeExpenseInputSchema,
    outputSchema: CategorizeExpenseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
