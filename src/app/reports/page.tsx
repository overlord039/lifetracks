"use client";

import React from 'react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const spendingData = [
  { name: 'Mon', spent: 25, budget: 40 },
  { name: 'Tue', spent: 38, budget: 40 },
  { name: 'Wed', spent: 15, budget: 40 },
  { name: 'Thu', spent: 45, budget: 40 },
  { name: 'Fri', spent: 55, budget: 40 },
  { name: 'Sat', spent: 70, budget: 60 },
  { name: 'Sun', spent: 50, budget: 60 },
];

const categoryData = [
  { name: 'Food', value: 400, color: '#64B5F6' },
  { name: 'Transport', value: 300, color: '#A5D6A7' },
  { name: 'Entertainment', value: 300, color: '#FFB74D' },
  { name: 'Misc', value: 200, color: '#BA68C8' },
];

export default function ReportsPage() {
  return (
    <AppShell>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Daily Spending vs Budget</CardTitle>
            <CardDescription>Visualizing your daily limits against actual spend.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="spent" fill="#64B5F6" radius={[4, 4, 0, 0]} name="Actual Spend" />
                <Bar dataKey="budget" fill="#E3F2FD" stroke="#64B5F6" strokeDasharray="5 5" name="Allowed Budget" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Where your money is going this month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-md">
          <CardHeader>
            <CardTitle>Learning Completion Rate</CardTitle>
            <CardDescription>Monthly consistency tracking.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spendingData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="spent" stroke="#A5D6A7" strokeWidth={3} dot={{ fill: '#A5D6A7' }} name="Completion %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
