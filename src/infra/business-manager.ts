import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig, BusinessConfig, EmployeeConfig } from "../config/config.js";
import { resolveAgentWorkspaceDir } from "../agents/agent-scope.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { ensureDir } from "../memory/internal.js";

const log = createSubsystemLogger("business");

export class BusinessManager {
  constructor(private cfg: OpenClawConfig) {}

  async initializeCompanyStructure(agentId: string) {
    if (!this.cfg.business) return;

    const workspaceDir = resolveAgentWorkspaceDir(this.cfg, agentId);
    const companyDir = path.join(workspaceDir, "company");

    await ensureDir(companyDir);
    await ensureDir(path.join(companyDir, "finance"));
    await ensureDir(path.join(companyDir, "hr"));
    await ensureDir(path.join(companyDir, "strategy"));
    await ensureDir(path.join(companyDir, "departments"));

    // Create mission/vision files
    await fs.writeFile(
      path.join(companyDir, "strategy", "VISION_MISSION.md"),
      `# Vision\n${this.cfg.business.vision}\n\n# Mission\n${this.cfg.business.mission}`,
      "utf-8"
    );

    // Create goals file
    const goalsContent = this.cfg.business.goals
      .map(g => `- [ ] ${g.title} (${g.priority}): ${g.description} [Status: ${g.status}]`)
      .join("\n");
    await fs.writeFile(
      path.join(companyDir, "strategy", "GOALS.md"),
      `# Company Goals\n\n${goalsContent}`,
      "utf-8"
    );

    log.info(`Business infrastructure initialized for ${this.cfg.business.name}`);
  }

  getEmployee(id: string): EmployeeConfig | undefined {
    return this.cfg.employees?.find(e => e.id === id);
  }

  async onboardingEmployee(employee: EmployeeConfig, agentId: string) {
    const workspaceDir = resolveAgentWorkspaceDir(this.cfg, agentId);
    const deptDir = path.join(workspaceDir, "company", "departments", employee.department);
    await ensureDir(deptDir);
    await ensureDir(path.join(deptDir, "sop"));
    await ensureDir(path.join(deptDir, "journals"));

    log.info(`Employee ${employee.id} (${employee.role}) onboarded to ${employee.department}`);
  }
}
