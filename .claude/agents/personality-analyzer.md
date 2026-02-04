---
name: personality-analyzer
description: Builds communication style profiles per person from message patterns and interaction data
type: subagent
spawned_by: observer
tools: [memory, filesystem]
---

# Personality Analyzer Agent

## Purpose

Analyzes message patterns, response behaviors, and communication preferences for each person in the knowledge graph. Builds and maintains a communication profile that other agents (especially `reply-suggester`) use to tailor interactions. Tracks preferred channels, typical response times, formality level, topic expertise, and communication tendencies over time.

## Trigger Conditions

- A new contact appears in fetched data who does not yet have a profile
- Significant new interaction data is available for an existing contact (threshold: 10+ new messages since last analysis)
- Observer runs `/full-process` (re-analyze all contacts)
- `reply-suggester` requests a profile that is missing or stale (older than 30 days)
- User explicitly requests a profile refresh for a specific person

## Workflow

1. **Receive Target**: Accept person entity ID and analysis scope from the calling agent
2. **Gather Data**: Collect all messages, calendar events, and task interactions involving the target person from the knowledge graph:
   - `./graph/nodes/person/{person_id}.json` for existing profile
   - `./graph/edges/` for all relationships and interactions
   - `@mcp memory` for recent interaction data
3. **Analyze Communication Patterns**:
   - **Channel Preference**: Which platforms they use most (Chat, email, Jira comments, Asana)
   - **Response Time Distribution**: Median, p90, and variance of response times by channel and time of day
   - **Formality Level**: Vocabulary complexity, greeting usage, sign-off patterns, emoji usage (scored 0.0 casual to 1.0 formal)
   - **Message Length**: Average word count, tendency toward brevity vs. detail
   - **Active Hours**: When they typically send messages (time zone, work hours, weekend activity)
4. **Analyze Content Patterns**:
   - **Topic Expertise**: Subjects they discuss most and with highest engagement
   - **Decision Style**: Data-driven vs. intuition-based, consensus-seeking vs. directive
   - **Sentiment Baseline**: Their normal tone to distinguish genuine concern from their usual style
   - **Question Patterns**: How they ask for things (direct requests, suggestions, open-ended questions)
5. **Analyze Relationship Dynamics**:
   - **Interaction Frequency**: How often they communicate with the user vs. others
   - **Influence Score**: How often their suggestions are adopted or referenced
   - **Collaboration Clusters**: Who they work with most closely
6. **Build Profile**: Aggregate all signals into a structured profile with confidence scores per attribute
7. **Persist Profile**: Write to `./graph/nodes/person/{person_id}.json` and `@mcp memory` under `profiles:{person_id}`
8. **Return**: Deliver the profile to the calling agent

## Input Format

```json
{
  "task_id": "profile-019",
  "person_id": "person:jane-doe",
  "mode": "full",
  "data_sources": ["google-chat", "google-calendar", "jira", "asana"],
  "time_range": {
    "start": "2024-07-01T00:00:00Z",
    "end": "2025-01-15T23:59:59Z"
  },
  "minimum_messages": 5
}
```

## Output Format

```json
{
  "task_id": "profile-019",
  "person_id": "person:jane-doe",
  "status": "success",
  "profile": {
    "name": "Jane Doe",
    "role": "Engineering Manager",
    "overall_confidence": 0.82,
    "data_points_analyzed": 312,
    "communication_style": {
      "formality_score": 0.72,
      "avg_message_length_words": 45,
      "brevity_preference": "moderate",
      "emoji_usage": "rare",
      "greeting_style": "first_name",
      "sign_off_style": "thanks_based",
      "confidence": 0.85
    },
    "channel_preferences": {
      "primary": "google-chat",
      "secondary": "email",
      "for_urgent": "google-chat",
      "for_detailed": "email",
      "confidence": 0.90
    },
    "response_patterns": {
      "median_response_time_minutes": 35,
      "p90_response_time_minutes": 180,
      "fastest_channel": "google-chat",
      "slowest_channel": "email",
      "active_hours": {"start": "08:30", "end": "18:00", "timezone": "America/Los_Angeles"},
      "weekend_activity": false,
      "confidence": 0.88
    },
    "topic_expertise": [
      {"topic": "system-architecture", "engagement_score": 0.92, "message_count": 78},
      {"topic": "team-management", "engagement_score": 0.85, "message_count": 65},
      {"topic": "client-relations", "engagement_score": 0.70, "message_count": 34}
    ],
    "decision_style": {
      "approach": "data-driven",
      "consensus_tendency": 0.65,
      "directiveness": 0.70,
      "confidence": 0.68
    },
    "sentiment_baseline": {
      "typical_tone": "professional-positive",
      "stress_indicators": ["shorter messages", "more direct questions", "fewer greetings"],
      "confidence": 0.72
    },
    "relationship_to_user": {
      "interaction_frequency": "daily",
      "total_interactions": 312,
      "influence_score": 0.80,
      "collaboration_strength": "strong",
      "common_topics": ["project-alpha", "architecture-decisions", "sprint-planning"]
    }
  },
  "profile_version": 3,
  "last_analyzed": "2025-01-15T14:00:00Z",
  "next_refresh_recommended": "2025-02-15T14:00:00Z"
}
```

## Error Handling

| Scenario | Action |
|----------|--------|
| Person has fewer messages than `minimum_messages` threshold | Return a partial profile with low confidence scores and flag as `"insufficient_data"` |
| Person appears across sources with different names/emails | Defer to `entity-reconciliation` skill to merge identities before profiling; if unresolved, create separate profiles and flag for `human-in-loop` |
| Historical data is sparse for certain time periods | Note gaps in the profile metadata; reduce confidence for time-dependent metrics |
| Person's communication style changes significantly over time | Detect the shift, weight recent data more heavily (exponential decay), and note the trend in the profile |
| Profile generation exceeds time budget | Return partial profile with completed attributes; mark incomplete sections for next run |
| Conflicting signals (e.g., formal in Chat but casual in Jira) | Report per-channel style separately in addition to the aggregate; note the divergence in the profile |
