# **App Name**: LifeTrack

## Core Features:

- Learning Progress Setup: Allows the user to set up their learning goals, including skills, difficulty levels, and daily targets. It should automatically set up the targets in Firestore.
- Learning Progress Tracking: Enables users to mark learning questions/tasks as completed, partial, or missed. Automatically track user learning progress.
- Smart Budget Setup: Users input their monthly budget and fixed expenses, with toggles to include/exclude expenses from the budget. Store to Firestore.
- Daily Rolling Budget: Automatically calculate the daily budget based on remaining funds and apply carry-forward or deduction logic based on spending habits. Store to Firestore.
- Expense Logging: Allows the user to log new expenses to the budget. The LLM will classify each expense automatically into user-defined expense categories, suggesting an existing category if available, or creating a new one if none seem to fit. This feature utilizes reasoning as a tool to effectively sort financial outflows.
- Automated Weekend/Holiday Budgets: Handle public holiday and weekend spend logic. Store which holidays are active on Firestore. Holiday and weekend bonuses are accounted for in daily spending. Calculate bonuses automatically.
- Daily Diary: Users record their daily activities, learnings, challenges, plans, and mood. Store in Firestore.

## Style Guidelines:

- Primary color: A calming blue (#64B5F6) to promote focus and productivity.
- Background color: A very light blue (#E3F2FD) provides a subtle backdrop.
- Accent color: A gentle green (#A5D6A7) to highlight successful achievements.
- Body and headline font: 'Inter', a sans-serif, for clean and modern readability.
- Use minimalist icons to represent categories and actions.
- Dashboard layout: Prioritize daily learning/budget summaries at the top, followed by detailed reports.
- Subtle transitions and animations when toggling fixed expenses or updating budget data.