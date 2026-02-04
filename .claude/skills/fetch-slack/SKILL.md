---
name: fetch-slack
description: Fetches messages, threads, and reactions from Slack workspaces via Web API
version: 2.0.0
trigger:
  - pattern: "fetch slack"
  - pattern: "get slack messages"
  - pattern: "slack channels"
  - pattern: "slack threads"
tags:
  - fetch
  - slack
  - communication
  - kg-enabled
confidence_threshold: 0.7
---

# Fetch Slack Skill

Retrieves messages, thread replies, reactions, and user profiles from Slack workspaces using the Slack Web API. Maps all fetched data to knowledge graph entities following the PWI graph schema.

## Usage

```
/fetch-slack [channel_name_or_id] [--since DATE] [--limit N] [--include-threads] [--include-reactions]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--since` | 7 days ago | Fetch messages after this date |
| `--limit` | 200 | Max messages per channel |
| `--include-threads` | true | Fetch full thread replies |
| `--include-reactions` | true | Track emoji reactions |
| `--channels` | all | Comma-separated channel list |
| `--user-enrich` | true | Enrich messages with user profiles |

## Environment Variables

Required (will prompt interactively if missing):

- `SLACK_BOT_TOKEN` - Slack Bot User OAuth Token (`xoxb-...`)
- `SLACK_WORKSPACE_ID` - Workspace identifier (optional, for multi-workspace)

### Required Bot Token Scopes

```yaml
scopes:
  - channels:history      # Read public channel messages
  - channels:read         # List public channels
  - groups:history        # Read private channel messages
  - groups:read           # List private channels
  - im:history            # Read DM messages
  - mpim:history          # Read group DM messages
  - reactions:read        # Read emoji reactions
  - users:read            # Read user profiles
  - users:read.email      # Read user email addresses
```

## Implementation

### Slack Client Setup

```python
import os
import time
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

logger = logging.getLogger("pwi.fetch-slack")

class SlackFetcher:
    """Fetches Slack data via Web API with rate limiting and KG mapping."""

    TIER_2_RATE_LIMIT = 20  # requests per minute
    REQUEST_INTERVAL = 60.0 / TIER_2_RATE_LIMIT  # 3 seconds between requests

    def __init__(self):
        self.token = os.environ.get("SLACK_BOT_TOKEN")
        if not self.token:
            raise EnvironmentError(
                "SLACK_BOT_TOKEN not set. "
                "Create a Slack app at https://api.slack.com/apps and add a Bot Token."
            )
        self.base_url = "https://slack.com/api"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json; charset=utf-8",
        }
        self._last_request_time = 0.0

    def _rate_limit(self):
        """Enforce Tier 2 rate limiting: 20 requests/minute."""
        elapsed = time.time() - self._last_request_time
        if elapsed < self.REQUEST_INTERVAL:
            sleep_time = self.REQUEST_INTERVAL - elapsed
            logger.debug(f"Rate limiting: sleeping {sleep_time:.2f}s")
            time.sleep(sleep_time)
        self._last_request_time = time.time()

    def _api_call(self, method: str, params: dict = None) -> dict:
        """Make a rate-limited Slack API call."""
        import requests

        self._rate_limit()
        url = f"{self.base_url}/{method}"
        response = requests.get(url, headers=self.headers, params=params or {})

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 30))
            logger.warning(f"Rate limited. Retrying after {retry_after}s")
            time.sleep(retry_after)
            return self._api_call(method, params)

        data = response.json()
        if not data.get("ok"):
            error = data.get("error", "unknown_error")
            raise SlackAPIError(method, error)

        return data
```

### Channel Message Retrieval with Cursor-Based Pagination

```python
    def fetch_channel_messages(
        self,
        channel_id: str,
        oldest: float = None,
        limit: int = 200,
    ) -> list[dict]:
        """
        Fetch messages from a channel using cursor-based pagination.

        Args:
            channel_id: Slack channel ID (e.g., C01ABCDEF)
            oldest: Unix timestamp - fetch messages after this time
            limit: Maximum number of messages to retrieve

        Returns:
            List of message dicts from Slack API
        """
        if oldest is None:
            oldest = (datetime.now(timezone.utc) - timedelta(days=7)).timestamp()

        all_messages = []
        cursor = None

        while len(all_messages) < limit:
            params = {
                "channel": channel_id,
                "oldest": str(oldest),
                "limit": min(200, limit - len(all_messages)),
                "inclusive": "true",
            }
            if cursor:
                params["cursor"] = cursor

            data = self._api_call("conversations.history", params)
            messages = data.get("messages", [])
            all_messages.extend(messages)

            # Check for next page via cursor
            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")
            if not cursor:
                break

        logger.info(f"Fetched {len(all_messages)} messages from channel {channel_id}")
        return all_messages[:limit]
```

### Thread Reply Fetching

```python
    def fetch_thread_replies(self, channel_id: str, thread_ts: str) -> list[dict]:
        """
        Fetch all replies in a message thread.

        Args:
            channel_id: Channel containing the thread
            thread_ts: Timestamp of the parent message

        Returns:
            List of reply message dicts (excludes parent)
        """
        all_replies = []
        cursor = None

        while True:
            params = {
                "channel": channel_id,
                "ts": thread_ts,
                "limit": 200,
            }
            if cursor:
                params["cursor"] = cursor

            data = self._api_call("conversations.replies", params)
            replies = data.get("messages", [])

            # First message is the parent; skip it
            if not cursor and replies:
                replies = replies[1:]

            all_replies.extend(replies)

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")
            if not cursor:
                break

        logger.info(
            f"Fetched {len(all_replies)} replies for thread {thread_ts} "
            f"in channel {channel_id}"
        )
        return all_replies
```

### User Profile Enrichment

```python
    def fetch_user_profile(self, user_id: str) -> dict:
        """
        Fetch and cache a Slack user profile.

        Returns:
            Dict with id, name, email, display_name, avatar, title, timezone
        """
        data = self._api_call("users.info", {"user": user_id})
        user = data.get("user", {})
        profile = user.get("profile", {})

        return {
            "id": user.get("id"),
            "name": user.get("real_name", user.get("name", "")),
            "email": profile.get("email"),
            "display_name": profile.get("display_name", ""),
            "avatar_url": profile.get("image_72", ""),
            "title": profile.get("title", ""),
            "timezone": user.get("tz", ""),
            "is_bot": user.get("is_bot", False),
        }

    def build_user_cache(self) -> dict:
        """Pre-fetch all workspace users into a lookup dict keyed by user ID."""
        users = {}
        cursor = None

        while True:
            params = {"limit": 200}
            if cursor:
                params["cursor"] = cursor

            data = self._api_call("users.list", params)
            for member in data.get("members", []):
                if not member.get("deleted"):
                    profile = member.get("profile", {})
                    users[member["id"]] = {
                        "id": member["id"],
                        "name": member.get("real_name", member.get("name", "")),
                        "email": profile.get("email"),
                        "display_name": profile.get("display_name", ""),
                        "is_bot": member.get("is_bot", False),
                    }

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")
            if not cursor:
                break

        logger.info(f"Cached {len(users)} user profiles")
        return users
```

### Reaction and Emoji Tracking

```python
    def extract_reactions(self, message: dict, user_cache: dict) -> list[dict]:
        """
        Extract reaction data from a message.

        Returns:
            List of reaction dicts with emoji name, count, and reactor info.
        """
        reactions = []
        for reaction in message.get("reactions", []):
            reactor_names = []
            for uid in reaction.get("users", []):
                user = user_cache.get(uid, {})
                reactor_names.append(user.get("name", uid))

            reactions.append({
                "emoji": reaction["name"],
                "count": reaction["count"],
                "reactors": reactor_names,
            })
        return reactions
```

### Full Fetch Orchestrator

```python
    def fetch_all(
        self,
        channels: list[str] = None,
        since_days: int = 7,
        limit: int = 200,
        include_threads: bool = True,
        include_reactions: bool = True,
    ) -> dict:
        """
        Orchestrate full Slack fetch across channels.

        Returns:
            Dict with messages, threads, users, and metadata.
        """
        oldest = (datetime.now(timezone.utc) - timedelta(days=since_days)).timestamp()
        user_cache = self.build_user_cache()

        # List channels if none specified
        if not channels:
            channel_data = self._api_call(
                "conversations.list",
                {"types": "public_channel,private_channel", "limit": 1000},
            )
            channels = [
                ch["id"] for ch in channel_data.get("channels", [])
                if ch.get("is_member")
            ]

        all_results = []

        for channel_id in channels:
            messages = self.fetch_channel_messages(channel_id, oldest=oldest, limit=limit)

            for msg in messages:
                sender_id = msg.get("user", "")
                sender_info = user_cache.get(sender_id, {})

                kg_node = self._to_kg_node(msg, sender_info, channel_id)

                # Fetch thread replies if message is a thread parent
                if include_threads and msg.get("reply_count", 0) > 0:
                    replies = self.fetch_thread_replies(channel_id, msg["ts"])
                    kg_node["thread_replies"] = [
                        self._to_kg_node(r, user_cache.get(r.get("user", ""), {}), channel_id)
                        for r in replies
                    ]

                # Extract reactions
                if include_reactions and msg.get("reactions"):
                    kg_node["reactions"] = self.extract_reactions(msg, user_cache)

                all_results.append(kg_node)

        return {
            "skill": "fetch-slack",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "messages": all_results,
            "users_enriched": len(user_cache),
            "channels_scanned": len(channels),
            "confidence": self._compute_confidence(all_results),
        }
```

## Rate Limiting

Slack API Tier 2 rate limits apply:

| Tier | Requests/min | Methods |
|------|-------------|---------|
| Tier 2 | 20 | `conversations.history`, `conversations.replies` |
| Tier 2 | 20 | `users.info`, `users.list` |
| Tier 3 | 50 | `conversations.list` |

```python
# Built-in handling:
# - 3-second minimum interval between Tier 2 calls
# - Automatic retry on HTTP 429 using Retry-After header
# - Exponential backoff for transient errors
```

## Knowledge Graph Integration

### Message-to-KG Node Mapping

Fetched Slack messages map to the `message` entity type in the graph schema (`./graph/chat/`):

```python
    def _to_kg_node(self, msg: dict, sender_info: dict, channel_id: str) -> dict:
        """
        Map a Slack message to a KG node following the graph schema.

        Schema entity type: message
        Directory: ./graph/chat/
        ID pattern: {source}_{id} -> slack_{channel}_{ts}
        """
        ts = msg.get("ts", "")
        timestamp = datetime.fromtimestamp(float(ts), tz=timezone.utc) if ts else None

        # Extract @mentions from message text
        mentions = self._extract_mentions(msg.get("text", ""))

        # Extract links from message blocks and text
        links = self._extract_links(msg)

        return {
            "id": f"slack_{channel_id}_{ts}",
            "source": "slack",
            "sender": sender_info.get("email", sender_info.get("name", msg.get("user", ""))),
            "text": msg.get("text", ""),
            "timestamp": timestamp.isoformat() if timestamp else None,
            "thread_id": msg.get("thread_ts"),
            "space": channel_id,
            "mentions": mentions,
            "links": links,
            "_meta": {
                "source_system": "slack",
                "sync_cursor": ts,
                "created_at": timestamp.isoformat() if timestamp else None,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        }

    def _extract_mentions(self, text: str) -> list[str]:
        """Extract @mentioned user IDs from Slack message text."""
        import re
        # Slack mentions are formatted as <@U01ABCDEF>
        return re.findall(r"<@(U[A-Z0-9]+)>", text)

    def _extract_links(self, msg: dict) -> list[str]:
        """Extract URLs from message text and blocks."""
        import re
        text = msg.get("text", "")
        # Slack URLs: <https://example.com|label> or <https://example.com>
        urls = re.findall(r"<(https?://[^|>]+)", text)
        return urls
```

### KG Edge Creation

```python
def create_kg_edges(message_node: dict, graph) -> list[dict]:
    """
    Create graph edges from a Slack message node.

    Relationships created:
      - contact --mentions--> message (from schema: mentions)
      - contact --sends--> message
      - message --in_thread--> message (thread parent)
    """
    edges = []
    sender = message_node["sender"]

    # Sender -> Message edge
    edges.append({
        "source": sender,
        "target": message_node["id"],
        "relation_type": "sends",
        "source_system": "slack",
        "last_activity": message_node["timestamp"],
    })

    # Mention edges
    for mention in message_node.get("mentions", []):
        edges.append({
            "source": mention,
            "target": message_node["id"],
            "relation_type": "mentioned_in",
            "source_system": "slack",
            "last_activity": message_node["timestamp"],
        })

    # Thread edges
    thread_id = message_node.get("thread_id")
    msg_ts = message_node["id"].split("_")[-1]
    if thread_id and thread_id != msg_ts:
        channel = message_node["space"]
        edges.append({
            "source": message_node["id"],
            "target": f"slack_{channel}_{thread_id}",
            "relation_type": "reply_to",
            "source_system": "slack",
            "last_activity": message_node["timestamp"],
        })

    return edges
```

### Persisting to Graph Directory

```python
def persist_to_graph(results: dict):
    """Write fetched Slack messages as KG nodes to ./graph/chat/."""
    graph_dir = Path("./graph/chat")
    graph_dir.mkdir(parents=True, exist_ok=True)

    for msg in results["messages"]:
        node_path = graph_dir / f"{msg['id']}.json"
        with open(node_path, "w") as f:
            json.dump(msg, f, indent=2, default=str)

    logger.info(f"Persisted {len(results['messages'])} Slack messages to {graph_dir}")
```

## Error Handling with Confidence Scoring

```python
class SlackAPIError(Exception):
    """Slack API error with context."""
    def __init__(self, method: str, error: str):
        self.method = method
        self.error = error
        super().__init__(f"Slack API error in {method}: {error}")


def _compute_confidence(self, results: list[dict]) -> float:
    """
    Compute confidence score for the fetch operation.

    Factors:
      - Data completeness: do messages have sender info, timestamps?
      - API errors encountered during fetch
      - Coverage: what percentage of channels were successfully fetched?
    """
    if not results:
        return 0.0

    scores = []

    for msg in results:
        msg_score = 1.0
        if not msg.get("sender"):
            msg_score -= 0.3
        if not msg.get("timestamp"):
            msg_score -= 0.3
        if not msg.get("text"):
            msg_score -= 0.2
        scores.append(max(0.0, msg_score))

    confidence = sum(scores) / len(scores) if scores else 0.0
    return round(confidence, 3)
```

## Interactivity

### Auth Failure Handling

When authentication fails, trigger an interactive prompt:

```python
def handle_auth_failure(error: str) -> dict:
    """Handle Slack authentication failures interactively."""
    if error == "invalid_auth" or error == "not_authed":
        return {
            "ambiguity_detected": True,
            "confidence": 0.0,
            "question": "Slack authentication failed. How would you like to proceed?",
            "options": [
                {"id": 1, "label": "Enter a new SLACK_BOT_TOKEN"},
                {"id": 2, "label": "Guide me through creating a Slack app"},
                {"id": 3, "label": "Skip Slack fetch for now"},
            ],
            "default": 1,
        }
    elif error == "missing_scope":
        return {
            "ambiguity_detected": True,
            "confidence": 0.2,
            "question": "Slack bot token is missing required scopes. Add scopes in Slack app settings.",
            "options": [
                {"id": 1, "label": "Show required scopes and retry"},
                {"id": 2, "label": "Skip Slack fetch for now"},
            ],
            "default": 1,
        }
    elif error == "channel_not_found":
        return {
            "ambiguity_detected": True,
            "confidence": 0.3,
            "question": "Specified channel not found. The bot may not be a member.",
            "options": [
                {"id": 1, "label": "List available channels and choose"},
                {"id": 2, "label": "Enter a different channel ID"},
                {"id": 3, "label": "Skip this channel"},
            ],
            "default": 1,
        }
```

### Multiple Workspaces Found

```json
{
  "ambiguity_detected": true,
  "confidence": 0.4,
  "options": [
    {"id": 1, "name": "Acme Corp", "workspace_id": "T01ABC"},
    {"id": 2, "name": "Acme Staging", "workspace_id": "T02DEF"}
  ],
  "question": "Multiple Slack workspaces configured. Which one should be fetched?"
}
```

## Output JSON Format

Final output follows the graph schema and matches other fetch skills:

```json
{
  "skill": "fetch-slack",
  "timestamp": "2024-01-15T10:00:00Z",
  "messages": [
    {
      "id": "slack_C01ABCDEF_1705312200.000100",
      "source": "slack",
      "sender": "alice@example.com",
      "text": "The deploy is ready for review. <@U02XYZ> can you check?",
      "timestamp": "2024-01-15T10:30:00Z",
      "thread_id": "1705310000.000001",
      "space": "C01ABCDEF",
      "mentions": ["U02XYZ"],
      "links": [],
      "reactions": [
        {
          "emoji": "eyes",
          "count": 2,
          "reactors": ["Bob Smith", "Carol Jones"]
        }
      ],
      "thread_replies": [
        {
          "id": "slack_C01ABCDEF_1705313000.000200",
          "source": "slack",
          "sender": "bob@example.com",
          "text": "On it, will review by EOD",
          "timestamp": "2024-01-15T10:43:20Z",
          "thread_id": "1705310000.000001",
          "space": "C01ABCDEF",
          "mentions": [],
          "links": []
        }
      ],
      "_meta": {
        "source_system": "slack",
        "sync_cursor": "1705312200.000100",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T12:00:00Z"
      }
    }
  ],
  "users_enriched": 45,
  "channels_scanned": 8,
  "confidence": 0.92
}
```

## Subagent Integration

For large workspaces, parallelize across channels:

```yaml
parallel_batch:
  - subagent: slack-fetch-worker-1
    channels: [C01ABC, C02DEF, C03GHI]
  - subagent: slack-fetch-worker-2
    channels: [C04JKL, C05MNO, C06PQR]
  - subagent: slack-fetch-worker-3
    channels: [DMs]
```
