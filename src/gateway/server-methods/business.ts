import { budgetManager } from "../../infra/budget-manager.js";
import { loadConfig } from "../../config/config.js";
import type { GatewayRequestHandlers } from "./types.js";

export const businessHandlers: GatewayRequestHandlers = {
  "business.status": ({ respond }) => {
    const cfg = loadConfig();
    if (!cfg.business) {
      return respond(true, { enabled: false });
    }

    const employeeStats = (cfg.employees || []).map(emp => ({
      id: emp.id,
      role: emp.role,
      department: emp.department,
      spent: budgetManager.getSpend(emp.id),
      limit: emp.budgetLimit,
      remaining: budgetManager.getRemainingBudget(emp),
      withinBudget: budgetManager.isWithinBudget(emp),
    }));

    respond(true, {
      enabled: true,
      name: cfg.business.name,
      vision: cfg.business.vision,
      mission: cfg.business.mission,
      goals: cfg.business.goals,
      budget: {
        ...cfg.business.budget,
        totalSpent: employeeStats.reduce((sum, e) => sum + e.spent, 0),
      },
      employees: employeeStats,
    });
  },
};
