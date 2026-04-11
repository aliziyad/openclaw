# Profit King Communication Protocol & Budgeting

## JSON Task Schema
All inter-agent communication regarding tasks MUST follow this schema:

```json
{
  "taskId": "UUID",
  "assignedTo": "agent-id",
  "priority": "high|medium|low",
  "budget": {
    "limit": 5.00,
    "currency": "USD",
    "modelPreference": "sonnet|haiku|local"
  },
  "dependencies": ["taskId1", "taskId2"],
  "goal": "Clear description of the task goal",
  "context": "Any background information needed",
  "outputFormat": "Desired format (e.g., markdown, code, image-prompt)",
  "callback": "agent-id-to-report-to"
}
```

## Budgeting Strategy
1. **Model Selection**: Use `anthropic/claude-3-haiku` or local models for simple tasks. Reserve `opus` or `3.7 sonnet` for complex planning, code, or high-stakes content.
2. **Token Efficiency**: Keep context clean. Use `sessions_history` only when necessary and summarize previous turns.
3. **Budget Tracking**: The AI CEO and CFO will track total USD spend via usage metadata.

## Workflow Activation
1. CEO breaks down Founder's goals.
2. CEO assigns tasks to Department Chiefs.
3. Chiefs assign to specialized agents.
4. Completion is verified by the Task Validator.
5. Quality is checked by the Auditor.
6. Memory Manager synthesizes learnings into SOPs.
