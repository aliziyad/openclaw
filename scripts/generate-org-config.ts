import * as fs from 'fs';

const brand = "Profit King";
const brandId = "profit-king";
const rootDir = `company/brands/${brand}`;

const departments = [
  {
    id: "product-engineering",
    name: "Product & Engineering",
    roles: [
      { id: "cto", name: "Chief Technology Officer" },
      { id: "product-manager", name: "Product Manager" },
      { id: "software-engineer", name: "Software Engineer" },
      { id: "qa-test-engineer", name: "QA/Test Engineer" },
      { id: "devops-engineer", name: "DevOps Engineer" },
      { id: "ui-ux-designer", name: "UI/UX Designer" }
    ]
  },
  {
    id: "growth-marketing",
    name: "Growth & Marketing",
    roles: [
      { id: "cmo", name: "Chief Marketing Officer" },
      { id: "content-strategist", name: "Content Strategist" },
      { id: "copywriter", name: "Copywriter" },
      { id: "media-buyer", name: "Media Buyer" },
      { id: "seo-specialist", name: "SEO Specialist" },
      { id: "social-media-manager", name: "Social Media Manager" },
      { id: "funnel-builder", name: "Funnel Builder" },
      { id: "email-marketing-manager", name: "Email Marketing Manager" }
    ]
  },
  {
    id: "sales",
    name: "Sales",
    roles: [
      { id: "cro", name: "Chief Revenue Officer" },
      { id: "sales-strategist", name: "Sales Strategist" },
      { id: "sdr", name: "Sales Development Representative" },
      { id: "closer", name: "Closer" },
      { id: "partnership-manager", name: "Partnership Manager" }
    ]
  },
  {
    id: "customer-success",
    name: "Customer Success",
    roles: [
      { id: "head-of-customer-success", name: "Head of Customer Success" },
      { id: "support-agent", name: "Support Agent" },
      { id: "onboarding-specialist", name: "Onboarding Specialist" },
      { id: "retention-manager", name: "Retention Manager" }
    ]
  },
  {
    id: "operations",
    name: "Operations",
    roles: [
      { id: "coo", name: "Chief Operating Officer" },
      { id: "project-manager", name: "Project Manager" },
      { id: "process-optimizer", name: "Process Optimizer" },
      { id: "automation-engineer", name: "Automation Engineer" }
    ]
  },
  {
    id: "data-intelligence",
    name: "Data & Intelligence",
    roles: [
      { id: "chief-data-officer", name: "Chief Data Officer" },
      { id: "data-analyst", name: "Data Analyst" },
      { id: "bi-agent", name: "Business Intelligence Agent" },
      { id: "experimentation-manager", name: "Experimentation Manager" }
    ]
  },
  {
    id: "finance-legal",
    name: "Finance & Legal",
    roles: [
      { id: "cfo", name: "Chief Financial Officer" },
      { id: "accountant", name: "Accountant" },
      { id: "financial-planner", name: "Financial Planner" },
      { id: "compliance-agent", name: "Compliance Agent" }
    ]
  },
  {
    id: "security-risk",
    name: "Security & Risk",
    roles: [
      { id: "security-officer", name: "Security Officer" },
      { id: "risk-analyst", name: "Risk Analyst" },
      { id: "fraud-detection-agent", name: "Fraud Detection Agent" }
    ]
  },
  {
    id: "innovation-rd",
    name: "Innovation / R&D",
    roles: [
      { id: "head-of-research", name: "Head of Research" },
      { id: "experimentation-agent", name: "Experimentation Agent" },
      { id: "prototype-builder", name: "Prototype Builder" }
    ]
  },
  {
    id: "meta-control",
    name: "Meta-Control",
    roles: [
      { id: "auditor", name: "Auditor" },
      { id: "task-validator", name: "Task Validator" },
      { id: "memory-manager", name: "Memory Manager" },
      { id: "prompt-engineer", name: "Prompt Engineer" }
    ]
  }
];

const agents = [];

// Add CEO
agents.push({
  id: `${brandId}-ceo`,
  name: `${brand} CEO`,
  workspace: `${rootDir}/ceo`,
  model: "anthropic/claude-3-7-sonnet-latest",
  subagents: {
    allowAgents: ["*"]
  },
  tools: {
    profile: "full"
  }
});

// Add all other agents
for (const dept of departments) {
  for (const role of dept.roles) {
    agents.push({
      id: `${brandId}-${role.id}`,
      name: `${brand} ${role.name}`,
      workspace: `${rootDir}/departments/${dept.id}/${role.id}`,
      model: "anthropic/claude-3-5-sonnet-latest",
      subagents: {
        allowAgents: ["*"]
      },
      tools: {
        profile: "full"
      }
    });
  }
}

const config = {
  agents: {
    defaults: {
      model: "anthropic/claude-3-5-sonnet-latest",
      sandbox: {
        mode: "non-main",
        workspaceAccess: "rw"
      }
    },
    list: agents
  }
};

fs.writeFileSync('openclaw.json', JSON.stringify(config, null, 2));
console.log("openclaw.json generated successfully.");
