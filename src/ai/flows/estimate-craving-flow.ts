
'use server';
/**
 * @fileOverview An AI agent that estimates nutritional data and costs for resisted cravings.
 *
 * - estimateCraving - A function that estimates calories and market price for a craving description.
 * - EstimateCravingInput - The input type.
 * - EstimateCravingOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EstimateCravingInputSchema = z.object({
  description: z.string().describe('The description of the food/drink (e.g., "1 chocolate milkshake", "2 slices of pepperoni pizza").'),
});
export type EstimateCravingInput = z.infer<typeof EstimateCravingInputSchema>;

const EstimateCravingOutputSchema = z.object({
  foodName: z.string().describe('The standardized name of the item.'),
  calories: z.number().describe('Estimated calories avoided.'),
  estimatedPrice: z.number().describe('Estimated market price in ₹ (INR).'),
  category: z.enum(["drinks", "desserts", "fast_food", "snacks", "others"]).describe('The category of the food.'),
  reasoning: z.string().describe('A brief explanation for the estimates.'),
});
export type EstimateCravingOutput = z.infer<typeof EstimateCravingOutputSchema>;

export async function estimateCraving(input: EstimateCravingInput): Promise<EstimateCravingOutput> {
  return estimateCravingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'estimateCravingPrompt',
  input: {schema: EstimateCravingInputSchema},
  output: {schema: EstimateCravingOutputSchema},
  prompt: `You are a nutrition and market pricing expert.
Analyze the following food/drink description and estimate:
1. Calories: Provide a realistic calorie count for the given quantity.
2. Market Price: Provide a realistic average price in Indian Rupees (₹) for such an item in an urban Indian setting (e.g., a cafe or restaurant).

Input Description: {{{description}}}

Base your price estimates on typical Indian restaurant or food delivery prices (e.g., Swiggy/Zomato averages).
`,
});

const estimateCravingFlow = ai.defineFlow(
  {
    name: 'estimateCravingFlow',
    inputSchema: EstimateCravingInputSchema,
    outputSchema: EstimateCravingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
