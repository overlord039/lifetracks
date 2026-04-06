
-- Relational Schema for LifeTrack Migration (PostgreSQL)

-- 1. Users Table
CREATE TABLE users (
    id TEXT PRIMARY KEY, -- Maps to Firebase UID
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Expense Categories (Labels)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name_encrypted TEXT NOT NULL,
    category_type TEXT CHECK (category_type IN ('daily', 'fixed')),
    is_private BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Salary Planner Profiles
CREATE TABLE salary_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    salary_encrypted TEXT NOT NULL,
    age_encrypted TEXT NOT NULL,
    expense_percent DECIMAL DEFAULT 50,
    savings_percent DECIMAL DEFAULT 20,
    investment_percent DECIMAL DEFAULT 20,
    health_percent DECIMAL DEFAULT 5,
    personal_percent DECIMAL DEFAULT 5,
    is_encrypted BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Debts Table
CREATE TABLE debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    debtor_name_encrypted TEXT NOT NULL,
    amount_encrypted TEXT NOT NULL,
    description_encrypted TEXT,
    is_paid BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Learning Goals
CREATE TABLE learning_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    skill TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    daily_target INTEGER NOT NULL,
    completed_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Daily Diaries
CREATE TABLE daily_diaries (
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    what_i_did_today_encrypted TEXT,
    what_i_learned_encrypted TEXT,
    challenges_encrypted TEXT,
    tomorrows_plan_encrypted TEXT,
    mood_encrypted TEXT,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, entry_date)
);

-- 7. Monthly Budgets (Personal Pool)
CREATE TABLE monthly_budgets (
    id TEXT PRIMARY KEY, -- e.g., "202310"
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    total_budget_encrypted TEXT,
    base_budget_encrypted TEXT,
    extra_budget_encrypted TEXT,
    is_weekend_extra_enabled BOOLEAN DEFAULT false,
    is_daily_limit_enabled BOOLEAN DEFAULT true,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Shared Groups (Rooms)
CREATE TABLE shared_groups (
    id TEXT PRIMARY KEY, -- e.g., Short code like "ABC123XY"
    name_encrypted TEXT NOT NULL,
    created_by TEXT REFERENCES users(id),
    is_manual BOOLEAN DEFAULT false,
    is_encrypted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Shared Group Membership
CREATE TABLE group_members (
    group_id TEXT REFERENCES shared_groups(id) ON DELETE CASCADE,
    user_id TEXT, -- Can be NULL for virtual members
    virtual_id TEXT, -- ID for manual room members not in the users table
    user_name TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT false,
    PRIMARY KEY (group_id, COALESCE(user_id, virtual_id))
);

-- 10. Room Expenses
CREATE TABLE room_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id TEXT REFERENCES shared_groups(id) ON DELETE CASCADE,
    description TEXT,
    amount DECIMAL NOT NULL,
    paid_by_user_id TEXT, -- Links to users or virtual members
    paid_by_virtual_id TEXT,
    category_name TEXT, -- Simplified reference
    split_type TEXT CHECK (split_type IN ('equal', 'custom', 'percentage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Room Expense Splits
CREATE TABLE room_expense_splits (
    expense_id UUID REFERENCES room_expenses(id) ON DELETE CASCADE,
    user_id TEXT,
    virtual_id TEXT,
    amount_share DECIMAL NOT NULL,
    PRIMARY KEY (expense_id, COALESCE(user_id, virtual_id))
);

-- Indexes for performance
CREATE INDEX idx_user_categories ON expense_categories(user_id);
CREATE INDEX idx_user_debts ON debts(user_id, is_paid);
CREATE INDEX idx_group_expenses ON room_expenses(group_id);
CREATE INDEX idx_diary_date ON daily_diaries(entry_date);
