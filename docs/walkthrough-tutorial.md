# Build a Customer Feedback SaaS in One Afternoon

You want to build a product. Not write boilerplate. Not configure tooling. Not babysit an AI.

This tutorial shows you how to build a complete **Customer Feedback SaaS** — from zero to deployed — using this boilerplate and Claude Code's autonomous workflows.

By the end, you'll have:
- A widget your customers embed on their sites
- A dashboard showing feedback with sentiment analysis
- Email alerts for negative feedback
- Stripe billing for paid plans

Let's go.

---

## The Big Picture

Here's what autonomous development looks like:

```
You describe what you want
    |
    v
Claude creates a plan (tasks, dependencies, phases)
    |
    v
WorkflowEngine executes tasks using specialized agents
    |
    v
Checkpoints save progress (rollback if needed)
    |
    v
You review at key points (or let it run fully autonomous)
    |
    v
Done.
```

The `src/lib/autonomous/` system handles all of this. You just describe the outcome.

---

## Step 1: Clone and Setup (5 minutes)

```bash
git clone https://github.com/your-org/ai-native-boilerplate feedback-saas
cd feedback-saas
bun install
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://..."   # Neon, Supabase, or local
BETTER_AUTH_SECRET="your-secret"
STRIPE_SECRET_KEY="sk_test_..."
OPENAI_API_KEY="sk-..."           # For sentiment analysis
```

Push the schema:

```bash
bun db:push
```

Start Claude Code:

```bash
claude
```

---

## Step 2: Describe What You Want

Don't write specs. Just talk.

```
You: Build a customer feedback SaaS. Here's what I need:

1. WIDGET: A JavaScript snippet customers embed on their sites.
   Shows a floating button. Click opens a form: rating (1-5 stars),
   comment, optional email. Submits to our API.

2. DASHBOARD: Shows all feedback with:
   - Sentiment (positive/neutral/negative) auto-detected
   - Filters by date, sentiment, rating
   - Search
   - Reply to feedback (sends email if provided)

3. BILLING: Free tier (100 feedback/month), Pro ($29/month, unlimited)

4. ALERTS: Email me when negative feedback comes in.

Use the existing auth, database, and Stripe setup.
```

That's it. Claude now has context.

---

## Step 3: Let Claude Plan

Claude enters plan mode automatically for complex work. Here's what happens inside `src/lib/autonomous/`:

```typescript
// The WorkflowEngine creates a plan
const plan: WorkflowPlan = {
  title: "Customer Feedback SaaS",
  phases: [
    { id: "schema", name: "Database Schema", taskIds: ["t1", "t2"] },
    { id: "api", name: "API Layer", taskIds: ["t3", "t4", "t5"] },
    { id: "widget", name: "Embed Widget", taskIds: ["t6", "t7"] },
    { id: "dashboard", name: "Dashboard UI", taskIds: ["t8", "t9", "t10"] },
    { id: "billing", name: "Billing Integration", taskIds: ["t11", "t12"] },
    { id: "alerts", name: "Alert System", taskIds: ["t13"] },
  ],
  tasks: [
    { id: "t1", title: "Create feedback schema", dependencies: [] },
    { id: "t2", title: "Create projects schema", dependencies: [] },
    { id: "t3", title: "POST /api/v1/feedback", dependencies: ["t1", "t2"] },
    // ... more tasks with dependencies
  ]
};
```

You'll see output like:

```
Planning: Customer Feedback SaaS

Phase 1: Database Schema
  [1] Create feedback table (rating, comment, sentiment, projectId)
  [2] Create projects table (userId, apiKey, plan, feedbackCount)

Phase 2: API Layer
  [3] POST /api/v1/feedback - receive feedback (public, uses API key)
  [4] GET /api/v1/feedback - list feedback (authenticated)
  [5] POST /api/v1/feedback/[id]/reply - send reply email

Phase 3: Embed Widget
  [6] Build widget component
  [7] Create widget embed endpoint

Phase 4: Dashboard UI
  [8] Feedback list with filters
  [9] Feedback detail with reply
  [10] Analytics overview

Phase 5: Billing
  [11] Connect projects to Stripe
  [12] Enforce feedback limits

Phase 6: Alerts
  [13] Email on negative feedback

Proceed?
```

Say yes.

---

## Step 4: Execution Modes

The autonomous system has four modes. Pick based on how much you trust it:

| Mode | What happens |
|------|--------------|
| `supervised` | Asks before every action |
| `autonomous-low` | Auto-approves planning + tests |
| `autonomous-high` | Auto-approves most things |
| `full-auto` | Does everything without asking |

For building, use `autonomous-high`:

```
You: Run in autonomous-high mode with a $10 budget ceiling
```

This configures the `WorkflowEngine`:

```typescript
// src/lib/autonomous/types/execution-mode.ts
workflow.config = {
  mode: "autonomous-high",
  budget: { amount: 10, currency: "USD" },
  autoApprovalLevel: "high",
};
```

What gets auto-approved in `autonomous-high`:
- Planning
- Writing code
- Running tests
- Non-prod deployments

What still needs your approval:
- Production deployments
- Destructive operations
- Infrastructure changes

---

## Step 5: Watch It Build

### Agents Do the Work

The `AgentRegistry` spawns specialized agents:

```typescript
// src/lib/autonomous/core/agent-registry.ts
const agents = {
  planner: "Breaks down tasks, estimates complexity",
  developer: "Writes code",
  tester: "Writes and runs tests",
  reviewer: "Checks code quality",
  deployer: "Handles deployments"
};
```

Each agent works on its assigned tasks. When one finishes, it hands off to the next via the `MessageBus`:

```typescript
// Developer finishes, notifies tester
messageBus.publish({
  from: "developer",
  to: "tester",
  type: "handoff",
  payload: {
    taskId: "t3",
    status: "completed",
    artifacts: ["src/app/api/v1/feedback/route.ts"],
  }
});
```

### Checkpoints Save Progress

Every few tasks, the `CheckpointManager` saves state:

```typescript
// src/lib/autonomous/core/checkpoint-manager.ts
checkpoint = {
  id: "cp_1234",
  phase: "api",
  completedTasks: ["t1", "t2", "t3"],
  pendingTasks: ["t4", "t5", ...],
  rollback: {
    filesBackup: "/path/to/backup.tar.gz",
    gitCommit: "abc123",
    canRollback: true,
  }
};
```

If something breaks:

```
You: Rollback to checkpoint cp_1234
```

Files restore. You continue from there.

---

## Step 6: What Actually Gets Built

Here's the real code Claude generates:

### Database Schema

```typescript
// src/lib/db/schema.ts (additions)

export const sentimentEnum = pgEnum("sentiment", ["positive", "neutral", "negative"]);
export const planEnum = pgEnum("plan", ["free", "pro"]);

export const feedbackProjects = pgTable("feedback_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  domain: text("domain"),
  plan: planEnum("plan").notNull().default("free"),
  feedbackCount: integer("feedback_count").notNull().default(0),
  feedbackLimit: integer("feedback_limit").notNull().default(100),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => feedbackProjects.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  email: text("email"),
  sentiment: sentimentEnum("sentiment"),
  sentimentScore: integer("sentiment_score"),
  pageUrl: text("page_url"),
  replied: boolean("replied").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### Public Feedback API

```typescript
// src/app/api/v1/feedback/route.ts

export async function POST(request: Request) {
  // Get API key from header
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return Response.json({ error: "Missing API key" }, { status: 401 });
  }

  // Find project
  const project = await db.query.feedbackProjects.findFirst({
    where: eq(feedbackProjects.apiKey, apiKey),
  });
  if (!project) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Check limits
  if (project.plan === "free" && project.feedbackCount >= project.feedbackLimit) {
    return Response.json({ error: "Feedback limit reached" }, { status: 429 });
  }

  // Parse and validate
  const body = await request.json();
  const { rating, comment, email, pageUrl } = body;

  // Analyze sentiment (calls OpenAI)
  const { sentiment, score } = await analyzeSentiment(comment);

  // Save
  const [newFeedback] = await db.insert(feedback).values({
    projectId: project.id,
    rating,
    comment,
    email,
    sentiment,
    sentimentScore: score,
    pageUrl,
  }).returning();

  // Increment count
  await db.update(feedbackProjects)
    .set({ feedbackCount: project.feedbackCount + 1 })
    .where(eq(feedbackProjects.id, project.id));

  // Alert on negative
  if (sentiment === "negative") {
    await sendNegativeFeedbackAlert(project, newFeedback);
  }

  return Response.json({ success: true, id: newFeedback.id });
}
```

### Sentiment Analysis

```typescript
// src/lib/ai/sentiment.ts

export async function analyzeSentiment(text: string) {
  if (!text || text.length < 3) {
    return { sentiment: "neutral", score: 0 };
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Analyze sentiment. Return JSON: { "sentiment": "positive"|"neutral"|"negative", "score": -100 to 100 }`,
      },
      { role: "user", content: text },
    ],
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content!);
}
```

### Embed Widget

```typescript
// src/lib/widget/feedback-widget.tsx

export function FeedbackWidget({ apiKey, primaryColor = "#3b82f6" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    await fetch("/api/v1/feedback", {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: JSON.stringify({ rating, comment, pageUrl: location.href }),
    });
    setSubmitted(true);
  };

  if (!isOpen) {
    return <button onClick={() => setIsOpen(true)}>Feedback</button>;
  }

  if (submitted) {
    return <div>Thanks!</div>;
  }

  return (
    <div className="widget-form">
      <StarRating value={rating} onChange={setRating} />
      <textarea value={comment} onChange={e => setComment(e.target.value)} />
      <button onClick={submit} disabled={!rating}>Send</button>
    </div>
  );
}
```

---

## Step 7: Control the Flow

### Pause

```
You: Pause
```

Saves a checkpoint, stops execution. Come back anytime.

### Resume

```
You: Resume
```

Picks up where it left off.

### Resume from checkpoint

```
You: Resume from checkpoint cp_1234
```

Rolls back to that state, continues from there.

### Check status

```
You: Show status
```

```
Workflow: Customer Feedback SaaS
Status: executing
Progress: 67% (8/12 tasks)

Completed:
  [x] Create feedback schema
  [x] Create projects schema
  [x] POST /api/v1/feedback
  [x] GET /api/v1/feedback
  ...

In Progress:
  -> Feedback list with filters

Pending:
  [ ] Analytics overview
  [ ] Connect to Stripe
  ...

Checkpoints: 3 available
```

### Abort

```
You: Abort
```

Stop everything. Can't resume, but checkpoints remain for rollback.

---

## Step 8: Test and Ship

Claude runs tests automatically in autonomous modes:

```
Running tests...
  [pass] feedback API accepts valid requests
  [pass] feedback API rejects invalid API key
  [pass] feedback API enforces rate limits
  [pass] sentiment analysis categorizes correctly
  [pass] widget renders in all states
  ...

18 tests passed, 0 failed
Coverage: 84%
```

Deploy:

```
You: Deploy to production
```

In `autonomous-high`, this asks for confirmation:

```
Deploy to production?
[Approve] [Deny]
```

---

## Step 9: Give Customers the Widget

```html
<script src="https://yourapp.com/widget.js"></script>
<script>
  FeedbackWidget.init({
    apiKey: "fb_live_xxxxx",
    position: "bottom-right"
  });
</script>
```

Done. You have a SaaS.

---

## Quick Reference

| Say this | Does this |
|----------|-----------|
| "Run in supervised mode" | Asks before everything |
| "Run in autonomous-high mode" | Auto-approves most things |
| "Set budget to $X" | Stops if costs exceed |
| "Pause" | Saves checkpoint, stops |
| "Resume" | Continues from last point |
| "Resume from cp_XXX" | Rolls back, continues |
| "Rollback to cp_XXX" | Restores files |
| "Show status" | Progress and tasks |
| "Show checkpoints" | List saved states |
| "Abort" | Stop permanently |

---

## The Key Insight

You don't manage tasks. You don't write boilerplate. You describe outcomes.

The `src/lib/autonomous/` system:
- Breaks work into tasks with dependencies
- Assigns tasks to specialized agents
- Saves checkpoints for rollback
- Retries failures automatically
- Asks for approval when configured

Your job:
1. Describe what you want clearly
2. Pick an execution mode
3. Review at checkpoints if you want
4. Course-correct if needed

That's it. That's autonomous development.

---

## What to Build Next

Try these:

1. "Add a public feedback wall customers can share"
2. "Build an invoice generator SaaS"
3. "Add Slack notifications for feedback"

Each time: describe the outcome, let the system handle the rest.
