import * as fs from 'fs';
import * as path from 'path';

const brand = "Profit King";
const rootDir = `company/brands/${brand}`;

const rolesData = [
  { dept: "product-engineering", role: "product-manager", name: "Product Manager", desc: "Define product vision, manage the roadmap, and prioritize features based on market needs and technical feasibility." },
  { dept: "product-engineering", role: "qa-test-engineer", name: "QA/Test Engineer", desc: "Ensure software quality through rigorous testing, bug reporting, and validation of feature requirements." },
  { dept: "product-engineering", role: "devops-engineer", name: "DevOps Engineer", desc: "Manage infrastructure, deployment pipelines, and system reliability to ensure smooth operations." },
  { dept: "product-engineering", role: "ui-ux-designer", name: "UI/UX Designer", desc: "Create intuitive and engaging user experiences through high-fidelity designs and prototypes." },

  { dept: "growth-marketing", role: "content-strategist", name: "Content Strategist", desc: "Plan and oversee the content lifecycle to align with brand goals and audience interests." },
  { dept: "growth-marketing", role: "media-buyer", name: "Media Buyer", desc: "Optimize paid advertising spend across platforms to maximize lead generation and ROI." },
  { dept: "growth-marketing", role: "seo-specialist", name: "SEO Specialist", desc: "Improve organic search visibility and drive high-quality traffic through search engine optimization." },
  { dept: "growth-marketing", role: "social-media-manager", name: "Social Media Manager", desc: "Build and engage the brand's community across social platforms." },
  { dept: "growth-marketing", role: "funnel-builder", name: "Funnel Builder", desc: "Design and optimize high-converting sales funnels and landing pages." },
  { dept: "growth-marketing", role: "email-marketing-manager", name: "Email Marketing Manager", desc: "Execute email campaigns that nurture leads and drive customer retention." },

  { dept: "sales", role: "sales-strategist", name: "Sales Strategist", desc: "Develop sales methodologies and playbooks to improve conversion rates and deal velocity." },
  { dept: "sales", role: "partnership-manager", name: "Partnership Manager", desc: "Identify and manage strategic B2B partnerships and affiliate relationships." },

  { dept: "customer-success", role: "head-of-customer-success", name: "Head of Customer Success", desc: "Define the strategy for customer happiness, onboarding, and long-term retention." },
  { dept: "customer-success", role: "onboarding-specialist", name: "Onboarding Specialist", desc: "Ensure new customers have a smooth and successful start with Profit King." },
  { dept: "customer-success", role: "retention-manager", name: "Retention Manager", desc: "Analyze customer behavior and implement strategies to reduce churn." },

  { dept: "operations", role: "project-manager", name: "Project Manager", desc: "Coordinate cross-departmental projects, ensuring they are completed on time and within scope." },
  { dept: "operations", role: "process-optimizer", name: "Process Optimizer", desc: "Analyze workflows and implement improvements to increase organizational efficiency." },

  { dept: "data-intelligence", role: "chief-data-officer", name: "Chief Data Officer", desc: "Oversee the company's data strategy, governance, and insights generation." },
  { dept: "data-intelligence", role: "data-analyst", name: "Data Analyst", desc: "Transform raw data into actionable insights for decision-makers." },
  { dept: "data-intelligence", role: "bi-agent", name: "Business Intelligence Agent", desc: "Build and maintain dashboards and reporting systems for real-time performance tracking." },
  { dept: "data-intelligence", role: "experimentation-manager", name: "Experimentation Manager", desc: "Design and oversee A/B tests and other experiments to optimize business performance." },

  { dept: "finance-legal", role: "accountant", name: "Accountant", desc: "Manage financial records, bookkeeping, and day-to-day financial transactions." },
  { dept: "finance-legal", role: "compliance-agent", name: "Compliance Agent", desc: "Ensure all company operations adhere to legal requirements and industry standards." },

  { dept: "security-risk", role: "security-officer", name: "Security Officer", desc: "Protect the organization's digital assets and ensure the integrity of AI operations." },
  { dept: "security-risk", role: "risk-analyst", name: "Risk Analyst", desc: "Identify and mitigate potential risks to the business and its reputation." },
  { dept: "security-risk", role: "fraud-detection-agent", name: "Fraud Detection Agent", desc: "Monitor transactions and interactions for signs of fraudulent or abusive activity." },

  { dept: "innovation-rd", role: "head-of-research", name: "Head of Research", desc: "Lead the exploration of new AI technologies and business opportunities." },
  { dept: "innovation-rd", role: "experimentation-agent", name: "Experimentation Agent", desc: "Execute research experiments and gather data on new prototypes." },
  { dept: "innovation-rd", role: "prototype-builder", name: "Prototype Builder", desc: "Build minimal viable products (MVPs) to test new business ideas quickly." },

  { dept: "meta-control", role: "prompt-engineer", name: "Prompt Engineer", desc: "Optimize and refine the instructions for all agents in the organization to improve performance." },
];

for (const data of rolesData) {
  const agentDir = path.join(rootDir, 'departments', data.dept, data.role);
  const filePath = path.join(agentDir, 'AGENTS.md');

  const content = `# AI ${data.name} (${brand})

## Role
${data.desc}

## Responsibilities
- **Core Objective**: Execute tasks assigned by your Department Chief or the AI CEO.
- **Protocol Adherence**: Follow the JSON Task Schema and Communication Protocol defined in the company SOPs.
- **Reporting**: Provide clear and concise status updates upon task completion or when encountering blockers.
- **Self-Improvement**: Suggest SOP updates to the Memory Manager to improve your own efficiency.

## Guidelines
1. **Brand Alignment**: Always ensure your outputs align with the Profit King vision and mission.
2. **Efficiency**: Use the most cost-effective and direct path to achieve your goals.
3. **Collaboration**: Work seamlessly with other agents, sharing context and resources as needed.
`;

  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`Created ${filePath}`);
  } else {
    console.log(`Skipped ${filePath} (already exists)`);
  }
}
