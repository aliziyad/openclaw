import { Type } from "@sinclair/typebox";
import { writeConfigFile, loadConfig } from "../../config/config.js";
import type { OpenClawConfig, EmployeeConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { jsonResult, readStringParam, readNumberParam } from "./common.js";
import { BusinessManager } from "../../infra/business-manager.js";

const HireEmployeeSchema = Type.Object({
  id: Type.String({ description: "Unique ID for the employee" }),
  role: Type.String({ description: "Job title/role (e.g. Graphic Designer, Coder)" }),
  department: Type.String({ description: "Department name" }),
  budgetLimit: Type.Number({ description: "Monthly budget limit in USD" }),
  primaryModel: Type.String({ description: "Primary model to use (provider/model)" }),
  fallbackModel: Type.Optional(Type.String({ description: "Standard fallback model" })),
  cheapModel: Type.Optional(Type.String({ description: "Cost-saving fallback model" })),
});

export function createHireEmployeeTool(options: {
  config?: OpenClawConfig;
  agentSessionKey?: string;
}): AnyAgentTool | null {
  return {
    label: "HR: Hire Employee",
    name: "hire_employee",
    description: "Hire a permanent AI employee into the organization. This creates a specialized agent with a defined role, department, and budget. The CEO should use this to delegate recurring tasks to specialized staff.",
    parameters: HireEmployeeSchema,
    execute: async (_toolCallId, params) => {
      const cfg = loadConfig();
      const employee: EmployeeConfig = {
        id: readStringParam(params, "id", { required: true }),
        role: readStringParam(params, "role", { required: true }),
        department: readStringParam(params, "department", { required: true }),
        budgetLimit: readNumberParam(params, "budgetLimit", { required: true })!,
        primaryModel: readStringParam(params, "primaryModel", { required: true }),
        fallbackModel: readStringParam(params, "fallbackModel"),
        cheapModel: readStringParam(params, "cheapModel"),
      };

      const employees = cfg.employees || [];
      if (employees.some(e => e.id === employee.id)) {
        return jsonResult({ status: "error", message: `Employee with ID ${employee.id} already exists.` });
      }

      const nextCfg: OpenClawConfig = {
        ...cfg,
        employees: [...employees, employee],
        // Also ensure a corresponding agent exists in agents.list
        agents: {
          ...cfg.agents,
          list: [
            ...(cfg.agents?.list || []),
            {
              id: employee.id,
              model: { primary: employee.primaryModel },
              // In a real implementation, we'd also set up workspace and skills
            }
          ]
        }
      };

      try {
        await writeConfigFile(nextCfg);
        const biz = new BusinessManager(nextCfg);
        await biz.onboardingEmployee(employee, "main"); // Initial onboarding

        return jsonResult({
          status: "hired",
          message: `Successfully hired ${employee.role} (${employee.id}) into ${employee.department}.`,
          employee
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}
