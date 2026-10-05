
'use server';
/**
 * @fileOverview A diet plan generation AI agent.
 *
 * - generateDietPlan - A function that suggests a personalized diet strategy.
 * - GenerateDietPlanInput - The input type for the generateDietPlan function.
 * - GenerateDietPlanOutput - The return type for the generateDietPlan function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDietPlanInputSchema = z.object({
  weight: z.number().describe('Weight in kg'),
  height: z.number().describe('Height in cm'),
  age: z.number().describe('Age in years'),
  gender: z.enum(['male', 'female']).describe('Biological gender'),
  activityLevel: z.string().describe('Activity level (sedentary, light, moderate, active, very_active)'),
  goal: z.string().describe('Weight goal (lose, maintain, gain)'),
  targetCalories: z.number().describe('Planned daily calorie intake'),
  bmi: z.number().describe('Body Mass Index'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const GenerateDietPlanOutputSchema = z.object({
  planName: z.string().describe('A catchy name for the suggested diet plan.'),
  description: z.string().describe('A brief overview of why this plan fits the user.'),
  macros: z.object({
    protein: z.string().describe('Percentage or grams of protein suggested.'),
    carbs: z.string().describe('Percentage or grams of carbs suggested.'),
    fats: z.string().describe('Percentage or grams of fats suggested.'),
  }),
  mealSuggestions: z.array(z.object({
    meal: z.string().describe('Meal name (e.g., Breakfast)'),
    suggestions: z.array(z.string()).describe('List of food suggestions.'),
  })),
  tips: z.array(z.string()).describe('General nutritional or lifestyle tips.'),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;

export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  return generateDietPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: GenerateDietPlanInputSchema},
  output: {schema: GenerateDietPlanOutputSchema},
  prompt: `You are a professional clinical nutritionist and fitness strategist.
Based on the following physiological data, suggest a comprehensive but easy-to-follow diet strategy.

User Data:
- Weight: {{{weight}}} kg
- Height: {{{height}}} cm
- Age: {{{age}}} years
- Gender: {{{gender}}}
- Activity: {{{activityLevel}}}
- Goal: {{{goal}}}
- Target Intake: {{{targetCalories}}} kcal/day
- Current BMI: {{{bmi}}}

Please provide:
1. A descriptive name for the strategy.
2. A summary of the approach (High protein? Balanced? Low carb?).
3. Suggested Macro-nutrient split.
4. Specific meal suggestions for an urban professional context.
5. Actionable lifestyle tips.

Focus on sustainable, healthy eating habits suitable for someone using a life-tracking application.`,
});

const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: GenerateDietPlanInputSchema,
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
