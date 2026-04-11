export type CompanyGoal = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
};

export type BusinessConfig = {
  name: string;
  vision: string;
  mission: string;
  goals: CompanyGoal[];
  budget: {
    totalLimit: number;
    currency: string; // e.g. USD
    period: "monthly" | "total";
  };
};

export type EmployeeConfig = {
  id: string;
  role: string;
  department: string;
  budgetLimit: number;
  primaryModel: string;
  fallbackModel?: string;
  cheapModel?: string;
};
