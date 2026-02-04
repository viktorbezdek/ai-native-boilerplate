---
name: fetch-email
description: Fetches emails via IMAP with thread reconstruction and contact enrichment
version: 2.0.0
trigger:
  - pattern: "fetch email"
  - pattern: "get emails"
  - pattern: "fetch inbox"
  - pattern: "email messages"
tags:
  - fetch
  - email
  - communication
  - kg-enabled
confidence_threshold: 0.7
---

# Fetch Email Skill

Connects to an IMAP email server over TLS to fetch messages, reconstruct conversation threads, extract contacts, and map all data to knowledge graph entities following the PWI graph schema.

## Usage

```
/fetch-email [--folders INBOX,Sent] [--since DATE] [--limit N] [--search "QUERY"]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--folders` | INBOX,Sent | Comma-separated IMAP folder names |
| `--since` | 7 days ago | Fetch emails after this date |
| `--limit` | 200 | Max emails per folder |
| `--search` | none | IMAP search criteria (e.g., `FROM "alice@example.com"`) |
| `--include-attachments-meta` | true | Include attachment metadata (no binary) |
| `--thread-reconstruct` | true | Reconstruct conversation threads |

## Environment Variables

Required (will prompt interactively if missing):

- `IMAP_HOST` - IMAP server hostname (e.g., `imap.gmail.com`)
- `IMAP_PORT` - IMAP server port (default: `993` for TLS)
- `IMAP_USERNAME` - Email account username
- `IMAP_PASSWORD` - Email account password or app-specific password

### Gmail-Specific Notes

```yaml
gmail:
  host: imap.gmail.com
  port: 993
  auth: "App Password required (2FA must be enabled)"
  setup_url: "https://myaccount.google.com/apppasswords"
  special_folders:
    sent: "[Gmail]/Sent Mail"
    drafts: "[Gmail]/Drafts"
    all: "[Gmail]/All Mail"
    starred: "[Gmail]/Starred"
```

## Implementation

### IMAP Client with TLS and Connection Pooling

```python
import os
import ssl
import imaplib
import email
import email.utils
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from email.header import decode_header
from email.utils import parseaddr, parsedate_to_datetime
from pathlib import Path
from contextlib import contextmanager
from collections import defaultdict

logger = logging.getLogger("pwi.fetch-email")


class EmailFetcher:
    """Fetches email via IMAP with TLS, connection pooling, and KG mapping."""

    MAX_CONNECTIONS = 3
    FETCH_BATCH_SIZE = 50  # UIDs per IMAP FETCH command

    def __init__(self):
        self.host = os.environ.get("IMAP_HOST")
        self.port = int(os.environ.get("IMAP_PORT", "993"))
        self.username = os.environ.get("IMAP_USERNAME")
        self.password = os.environ.get("IMAP_PASSWORD")

        if not all([self.host, self.username, self.password]):
            raise EnvironmentError(
                "IMAP credentials not fully configured. "
                "Set IMAP_HOST, IMAP_USERNAME, and IMAP_PASSWORD environment variables."
            )

        self._connection_pool: list[imaplib.IMAP4_SSL] = []

    @contextmanager
    def _get_connection(self):
        """
        Get an IMAP connection from the pool or create a new one.
        Uses TLS (IMAP4_SSL) for secure connections.
        """
        conn = None
        try:
            if self._connection_pool:
                conn = self._connection_pool.pop()
                # Verify connection is still alive
                try:
                    conn.noop()
                except Exception:
                    conn = None

            if conn is None:
                ssl_context = ssl.create_default_context()
                conn = imaplib.IMAP4_SSL(
                    self.host,
                    self.port,
                    ssl_context=ssl_context,
                )
                conn.login(self.username, self.password)
                logger.info(f"Opened new IMAP connection to {self.host}:{self.port}")

            yield conn

        except imaplib.IMAP4.error as e:
            logger.error(f"IMAP error: {e}")
            conn = None
            raise
        finally:
            if conn is not None and len(self._connection_pool) < self.MAX_CONNECTIONS:
                self._connection_pool.append(conn)
            elif conn is not None:
                try:
                    conn.logout()
                except Exception:
                    pass

    def close_all(self):
        """Close all pooled connections."""
        for conn in self._connection_pool:
            try:
                conn.logout()
            except Exception:
                pass
        self._connection_pool.clear()
```

### Folder Scanning

```python
    def list_folders(self) -> list[dict]:
        """
        List all available IMAP folders.

        Returns:
            List of dicts with folder name, delimiter, and flags.
        """
        with self._get_connection() as conn:
            status, folder_list = conn.list()
            if status != "OK":
                raise IMAPFetchError("list", "Failed to list folders")

            folders = []
            for item in folder_list:
                if isinstance(item, bytes):
                    decoded = item.decode("utf-8", errors="replace")
                    # Parse IMAP LIST response: (\\Flags) "delimiter" "name"
                    parts = decoded.split(' "')
                    if len(parts) >= 2:
                        flags = parts[0].strip("() ")
                        name = parts[-1].strip('" ')
                        folders.append({
                            "name": name,
                            "flags": flags,
                        })

            logger.info(f"Found {len(folders)} IMAP folders")
            return folders

    def scan_folder(
        self,
        folder: str = "INBOX",
        since: datetime = None,
        limit: int = 200,
        search_criteria: str = None,
    ) -> list[dict]:
        """
        Scan a single IMAP folder for messages.

        Args:
            folder: IMAP folder name (e.g., INBOX, Sent, [Gmail]/Sent Mail)
            since: Fetch emails after this datetime
            limit: Maximum number of emails to fetch
            search_criteria: Optional IMAP SEARCH string

        Returns:
            List of parsed email dicts
        """
        if since is None:
            since = datetime.now(timezone.utc) - timedelta(days=7)

        with self._get_connection() as conn:
            status, _ = conn.select(f'"{folder}"', readonly=True)
            if status != "OK":
                logger.warning(f"Could not select folder: {folder}")
                return []

            # Build search criteria
            date_str = since.strftime("%d-%b-%Y")
            if search_criteria:
                criteria = f'(SINCE {date_str} {search_criteria})'
            else:
                criteria = f'(SINCE {date_str})'

            status, data = conn.search(None, criteria)
            if status != "OK":
                return []

            uids = data[0].split()
            if not uids:
                logger.info(f"No messages found in {folder} since {date_str}")
                return []

            # Take the most recent N messages
            uids = uids[-limit:]
            logger.info(f"Fetching {len(uids)} emails from {folder}")

            messages = []
            # Batch fetch for efficiency
            for i in range(0, len(uids), self.FETCH_BATCH_SIZE):
                batch = uids[i:i + self.FETCH_BATCH_SIZE]
                uid_set = b",".join(batch)
                status, msg_data = conn.fetch(uid_set, "(RFC822)")
                if status != "OK":
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        raw_email = response_part[1]
                        parsed = self._parse_email(raw_email, folder)
                        if parsed:
                            messages.append(parsed)

            return messages
```

### Email Parsing (Headers, Body, Attachments Metadata)

```python
    def _parse_email(self, raw: bytes, folder: str) -> dict | None:
        """
        Parse a raw email into a structured dict.

        Extracts headers, plain text body, and attachment metadata
        (no binary content is stored).
        """
        try:
            msg = email.message_from_bytes(raw)
        except Exception as e:
            logger.warning(f"Failed to parse email: {e}")
            return None

        # Decode subject
        subject = self._decode_header(msg.get("Subject", ""))

        # Parse addresses
        from_addr = parseaddr(msg.get("From", ""))
        to_addrs = self._parse_address_list(msg.get("To", ""))
        cc_addrs = self._parse_address_list(msg.get("Cc", ""))

        # Parse date
        date_str = msg.get("Date")
        try:
            date_parsed = parsedate_to_datetime(date_str) if date_str else None
        except Exception:
            date_parsed = None

        # Extract message ID and threading headers
        message_id = msg.get("Message-ID", "").strip("<>")
        in_reply_to = msg.get("In-Reply-To", "").strip("<>")
        references = [
            ref.strip("<>")
            for ref in msg.get("References", "").split()
            if ref.strip()
        ]

        # Extract body (plain text preferred)
        body = self._extract_body(msg)

        # Extract attachment metadata (no binary content)
        attachments = self._extract_attachment_metadata(msg)

        # Generate a stable ID
        stable_id = hashlib.sha256(
            (message_id or f"{from_addr[1]}_{date_str}_{subject}").encode()
        ).hexdigest()[:16]

        return {
            "message_id": message_id,
            "stable_id": stable_id,
            "subject": subject,
            "from": {"name": from_addr[0], "email": from_addr[1]},
            "to": to_addrs,
            "cc": cc_addrs,
            "date": date_parsed.isoformat() if date_parsed else None,
            "in_reply_to": in_reply_to or None,
            "references": references,
            "body": body,
            "folder": folder,
            "attachments": attachments,
        }

    def _decode_header(self, header_value: str) -> str:
        """Decode an RFC 2047 encoded email header."""
        parts = decode_header(header_value)
        decoded = []
        for part, charset in parts:
            if isinstance(part, bytes):
                decoded.append(part.decode(charset or "utf-8", errors="replace"))
            else:
                decoded.append(part)
        return "".join(decoded)

    def _parse_address_list(self, header: str) -> list[dict]:
        """Parse a comma-separated list of email addresses."""
        if not header:
            return []
        addresses = []
        # Handle comma-separated addresses
        for addr_str in header.split(","):
            name, addr = parseaddr(addr_str.strip())
            if addr:
                addresses.append({"name": name, "email": addr})
        return addresses

    def _extract_body(self, msg: email.message.Message) -> str:
        """Extract plain text body from email, preferring text/plain."""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                disposition = str(part.get("Content-Disposition", ""))
                if content_type == "text/plain" and "attachment" not in disposition:
                    payload = part.get_payload(decode=True)
                    if payload:
                        charset = part.get_content_charset() or "utf-8"
                        return payload.decode(charset, errors="replace")
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                charset = msg.get_content_charset() or "utf-8"
                return payload.decode(charset, errors="replace")
        return ""

    def _extract_attachment_metadata(self, msg: email.message.Message) -> list[dict]:
        """
        Extract metadata about attachments without storing binary content.

        Returns:
            List of dicts with filename, content_type, and size.
        """
        attachments = []
        if msg.is_multipart():
            for part in msg.walk():
                disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in disposition or "inline" in disposition:
                    filename = part.get_filename()
                    if filename:
                        filename = self._decode_header(filename)
                    content_type = part.get_content_type()
                    payload = part.get_payload(decode=True)
                    size = len(payload) if payload else 0

                    attachments.append({
                        "filename": filename or "unnamed",
                        "content_type": content_type,
                        "size_bytes": size,
                    })
        return attachments
```

### Thread Reconstruction via In-Reply-To and References

```python
    def reconstruct_threads(self, messages: list[dict]) -> list[dict]:
        """
        Reconstruct email threads using In-Reply-To and References headers.

        Groups messages into conversation threads and assigns a shared
        thread_id to each message. The thread_id is the Message-ID of
        the oldest known message in the thread.

        Args:
            messages: List of parsed email dicts

        Returns:
            The same messages with 'thread_id' and 'thread_position' added.
        """
        # Build a lookup: message_id -> message
        by_id = {m["message_id"]: m for m in messages if m.get("message_id")}

        # Union-Find structure to group thread members
        parent = {}

        def find(x):
            while parent.get(x, x) != x:
                parent[x] = parent.get(parent[x], parent[x])
                x = parent[x]
            return x

        def union(a, b):
            ra, rb = find(a), find(b)
            if ra != rb:
                parent[ra] = rb

        # Build thread groups using References and In-Reply-To
        for msg in messages:
            mid = msg.get("message_id")
            if not mid:
                continue

            # Link to In-Reply-To
            if msg.get("in_reply_to"):
                union(mid, msg["in_reply_to"])

            # Link all References together
            refs = msg.get("references", [])
            for ref in refs:
                union(mid, ref)

        # Group messages by thread root
        thread_groups = defaultdict(list)
        for msg in messages:
            mid = msg.get("message_id")
            if mid:
                root = find(mid)
                thread_groups[root].append(msg)
            else:
                # Messages without Message-ID are standalone
                thread_groups[f"_standalone_{id(msg)}"].append(msg)

        # Assign thread_id and position
        for root, thread_msgs in thread_groups.items():
            # Sort by date within thread
            thread_msgs.sort(key=lambda m: m.get("date") or "")
            thread_id = thread_msgs[0].get("message_id", root)

            for position, msg in enumerate(thread_msgs):
                msg["thread_id"] = thread_id
                msg["thread_position"] = position
                msg["thread_length"] = len(thread_msgs)

        logger.info(
            f"Reconstructed {len(thread_groups)} threads "
            f"from {len(messages)} messages"
        )
        return messages
```

### Contact Extraction and KG Enrichment

```python
    def extract_contacts(self, messages: list[dict]) -> dict[str, dict]:
        """
        Extract and deduplicate contacts from all email messages.

        Builds contact profiles with interaction counts and communication
        patterns suitable for the KG contact entity type.

        Returns:
            Dict keyed by email address with contact KG nodes.
        """
        contacts = {}

        for msg in messages:
            # Process From
            from_info = msg.get("from", {})
            if from_info.get("email"):
                self._upsert_contact(contacts, from_info, msg, role="sender")

            # Process To
            for to in msg.get("to", []):
                if to.get("email"):
                    self._upsert_contact(contacts, to, msg, role="recipient")

            # Process CC
            for cc in msg.get("cc", []):
                if cc.get("email"):
                    self._upsert_contact(contacts, cc, msg, role="cc")

        logger.info(f"Extracted {len(contacts)} unique contacts")
        return contacts

    def _upsert_contact(
        self,
        contacts: dict,
        addr_info: dict,
        msg: dict,
        role: str,
    ):
        """Update or insert a contact in the contacts dict."""
        addr = addr_info["email"].lower()
        if addr not in contacts:
            contacts[addr] = {
                "email": addr,
                "name": addr_info.get("name"),
                "aliases": set(),
                "interaction_count": 0,
                "last_interaction": None,
                "roles": defaultdict(int),
                "links": [],
            }

        contact = contacts[addr]

        # Track name aliases
        name = addr_info.get("name", "")
        if name and name != contact.get("name"):
            contact["aliases"].add(name)

        contact["interaction_count"] += 1
        contact["roles"][role] += 1

        msg_date = msg.get("date")
        if msg_date:
            if contact["last_interaction"] is None or msg_date > contact["last_interaction"]:
                contact["last_interaction"] = msg_date

    def contacts_to_kg_nodes(self, contacts: dict) -> list[dict]:
        """
        Convert extracted contacts to KG contact entity nodes.

        Schema entity type: contact
        Directory: ./graph/contacts/
        ID pattern: {email}
        """
        nodes = []
        for addr, info in contacts.items():
            nodes.append({
                "email": info["email"],
                "name": info.get("name") or "",
                "aliases": list(info.get("aliases", set())),
                "communication_style": {
                    "sent_count": info["roles"].get("sender", 0),
                    "received_count": info["roles"].get("recipient", 0),
                    "cc_count": info["roles"].get("cc", 0),
                },
                "last_interaction": info["last_interaction"],
                "interaction_count": info["interaction_count"],
                "links": info.get("links", []),
                "_meta": {
                    "source_system": "email",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
            })
        return nodes
```

### Full Fetch Orchestrator

```python
    def fetch_all(
        self,
        folders: list[str] = None,
        since_days: int = 7,
        limit: int = 200,
        search_criteria: str = None,
        reconstruct_threads: bool = True,
    ) -> dict:
        """
        Orchestrate full email fetch across folders.

        Returns:
            Dict with messages, threads, contacts, and metadata.
        """
        if folders is None:
            folders = ["INBOX", "Sent"]

        since = datetime.now(timezone.utc) - timedelta(days=since_days)
        all_messages = []

        try:
            for folder in folders:
                messages = self.scan_folder(
                    folder=folder,
                    since=since,
                    limit=limit,
                    search_criteria=search_criteria,
                )
                all_messages.extend(messages)

            # Reconstruct threads
            if reconstruct_threads:
                all_messages = self.reconstruct_threads(all_messages)

            # Extract contacts
            contacts = self.extract_contacts(all_messages)

            # Map to KG nodes
            kg_messages = [self._to_kg_node(msg) for msg in all_messages]
            kg_contacts = self.contacts_to_kg_nodes(contacts)

            confidence = self._compute_confidence(all_messages)

            return {
                "skill": "fetch-email",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "messages": kg_messages,
                "contacts": kg_contacts,
                "threads_reconstructed": len(
                    set(m.get("thread_id") for m in all_messages if m.get("thread_id"))
                ),
                "folders_scanned": len(folders),
                "confidence": confidence,
            }
        finally:
            self.close_all()
```

## Rate Limiting and Connection Pooling

```python
# Connection pooling:
# - Up to MAX_CONNECTIONS (3) persistent IMAP connections
# - Connections are reused across folder scans
# - Automatic reconnection on stale connections (NOOP check)
# - Connections closed gracefully via close_all()

# Rate limiting:
# - Batch FETCH commands: 50 UIDs per request to avoid server limits
# - Sequential folder scanning to avoid overwhelming the server
# - Configurable limits per folder (--limit flag)
# - Respects IMAP server connection limits (typically 10-15 concurrent)
```

## Knowledge Graph Integration

### Email-to-KG Node Mapping

Fetched emails map to the `message` entity type in the graph schema (`./graph/chat/`):

```python
    def _to_kg_node(self, parsed_email: dict) -> dict:
        """
        Map a parsed email to a KG node following the graph schema.

        Schema entity type: message
        Directory: ./graph/chat/
        ID pattern: {source}_{id} -> email_{stable_id}
        """
        # Collect all mentioned contacts
        mentions = []
        for recipient in parsed_email.get("to", []):
            if recipient.get("email"):
                mentions.append(recipient["email"])
        for cc in parsed_email.get("cc", []):
            if cc.get("email"):
                mentions.append(cc["email"])

        # Collect attachment links as references
        attachment_refs = [
            f"attachment:{a['filename']}"
            for a in parsed_email.get("attachments", [])
        ]

        return {
            "id": f"email_{parsed_email['stable_id']}",
            "source": "email",
            "sender": parsed_email["from"]["email"],
            "text": f"Subject: {parsed_email['subject']}\n\n{parsed_email.get('body', '')}",
            "timestamp": parsed_email.get("date"),
            "thread_id": parsed_email.get("thread_id"),
            "space": parsed_email.get("folder"),
            "mentions": mentions,
            "links": attachment_refs,
            "attachments": parsed_email.get("attachments", []),
            "_meta": {
                "source_system": "email",
                "sync_cursor": parsed_email.get("message_id"),
                "created_at": parsed_email.get("date"),
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "subject": parsed_email.get("subject"),
                "in_reply_to": parsed_email.get("in_reply_to"),
                "references": parsed_email.get("references", []),
                "thread_position": parsed_email.get("thread_position"),
                "thread_length": parsed_email.get("thread_length"),
            },
        }
```

### KG Edge Creation

```python
def create_kg_edges(message_node: dict, graph) -> list[dict]:
    """
    Create graph edges from an email message node.

    Relationships created:
      - contact --sends--> message
      - contact --receives--> message (To recipients)
      - contact --cc_on--> message (CC recipients)
      - message --in_thread--> message (thread parent via In-Reply-To)
    """
    edges = []
    sender = message_node["sender"]

    # Sender -> Message
    edges.append({
        "source": sender,
        "target": message_node["id"],
        "relation_type": "sends",
        "source_system": "email",
        "last_activity": message_node["timestamp"],
    })

    # Recipient edges
    for mention in message_node.get("mentions", []):
        edges.append({
            "source": mention,
            "target": message_node["id"],
            "relation_type": "receives",
            "source_system": "email",
            "last_activity": message_node["timestamp"],
        })

    # Thread edge via In-Reply-To
    in_reply_to = message_node.get("_meta", {}).get("in_reply_to")
    if in_reply_to:
        # Find the target node ID from the replied-to message
        reply_stable_id = hashlib.sha256(in_reply_to.encode()).hexdigest()[:16]
        edges.append({
            "source": message_node["id"],
            "target": f"email_{reply_stable_id}",
            "relation_type": "reply_to",
            "source_system": "email",
            "last_activity": message_node["timestamp"],
        })

    return edges
```

### Persisting to Graph Directory

```python
def persist_to_graph(results: dict):
    """Write fetched emails as KG nodes to ./graph/chat/ and ./graph/contacts/."""
    chat_dir = Path("./graph/chat")
    contacts_dir = Path("./graph/contacts")
    chat_dir.mkdir(parents=True, exist_ok=True)
    contacts_dir.mkdir(parents=True, exist_ok=True)

    for msg in results["messages"]:
        node_path = chat_dir / f"{msg['id']}.json"
        with open(node_path, "w") as f:
            json.dump(msg, f, indent=2, default=str)

    for contact in results["contacts"]:
        node_path = contacts_dir / f"{contact['email']}.json"
        with open(node_path, "w") as f:
            json.dump(contact, f, indent=2, default=str)

    logger.info(
        f"Persisted {len(results['messages'])} emails to {chat_dir}, "
        f"{len(results['contacts'])} contacts to {contacts_dir}"
    )
```

## Error Handling with Confidence Scoring

```python
class IMAPFetchError(Exception):
    """IMAP operation error with context."""
    def __init__(self, operation: str, detail: str):
        self.operation = operation
        self.detail = detail
        super().__init__(f"IMAP error during {operation}: {detail}")


def _compute_confidence(self, messages: list[dict]) -> float:
    """
    Compute confidence score for the fetch operation.

    Factors:
      - Data completeness: sender, date, subject present?
      - Thread reconstruction success rate
      - Parse error rate
    """
    if not messages:
        return 0.0

    scores = []
    for msg in messages:
        msg_score = 1.0
        if not msg.get("from", {}).get("email"):
            msg_score -= 0.3
        if not msg.get("date"):
            msg_score -= 0.2
        if not msg.get("subject"):
            msg_score -= 0.1
        if not msg.get("body"):
            msg_score -= 0.2
        if not msg.get("thread_id"):
            msg_score -= 0.1
        scores.append(max(0.0, msg_score))

    confidence = sum(scores) / len(scores) if scores else 0.0
    return round(confidence, 3)
```

## Interactivity

### Auth Failure Handling

When IMAP authentication fails, trigger an interactive prompt:

```python
def handle_auth_failure(error: Exception) -> dict:
    """Handle IMAP authentication failures interactively."""
    error_str = str(error).lower()

    if "authentication failed" in error_str or "login" in error_str:
        return {
            "ambiguity_detected": True,
            "confidence": 0.0,
            "question": "Email authentication failed. How would you like to proceed?",
            "options": [
                {"id": 1, "label": "Enter new IMAP credentials"},
                {"id": 2, "label": "Guide me through Gmail App Password setup"},
                {"id": 3, "label": "Try a different IMAP server"},
                {"id": 4, "label": "Skip email fetch for now"},
            ],
            "default": 1,
        }
    elif "ssl" in error_str or "tls" in error_str:
        return {
            "ambiguity_detected": True,
            "confidence": 0.1,
            "question": "TLS/SSL connection to mail server failed.",
            "options": [
                {"id": 1, "label": "Verify IMAP host and port settings"},
                {"id": 2, "label": "Try port 993 (IMAPS) or 143 (STARTTLS)"},
                {"id": 3, "label": "Skip email fetch for now"},
            ],
            "default": 1,
        }
    elif "folder" in error_str or "mailbox" in error_str:
        return {
            "ambiguity_detected": True,
            "confidence": 0.3,
            "question": "Specified email folder not found on server.",
            "options": [
                {"id": 1, "label": "List available folders and choose"},
                {"id": 2, "label": "Use default INBOX only"},
                {"id": 3, "label": "Enter folder name manually"},
            ],
            "default": 1,
        }
```

### Ambiguous Folder Names

```json
{
  "ambiguity_detected": true,
  "confidence": 0.4,
  "options": [
    {"id": 1, "name": "Sent", "imap_name": "Sent"},
    {"id": 2, "name": "Sent Items", "imap_name": "Sent Items"},
    {"id": 3, "name": "[Gmail]/Sent Mail", "imap_name": "[Gmail]/Sent Mail"}
  ],
  "question": "Multiple 'Sent' folders found. Which one contains your sent emails?"
}
```

## Output JSON Format

Final output follows the graph schema and matches other fetch skills:

```json
{
  "skill": "fetch-email",
  "timestamp": "2024-01-15T10:00:00Z",
  "messages": [
    {
      "id": "email_a1b2c3d4e5f67890",
      "source": "email",
      "sender": "alice@example.com",
      "text": "Subject: Q4 Planning Review\n\nHi team, please see the attached doc for Q4 priorities...",
      "timestamp": "2024-01-15T09:30:00Z",
      "thread_id": "abc123@mail.example.com",
      "space": "INBOX",
      "mentions": ["bob@example.com", "carol@example.com"],
      "links": ["attachment:Q4-Priorities.pdf"],
      "attachments": [
        {
          "filename": "Q4-Priorities.pdf",
          "content_type": "application/pdf",
          "size_bytes": 245760
        }
      ],
      "_meta": {
        "source_system": "email",
        "sync_cursor": "msg-001@mail.example.com",
        "created_at": "2024-01-15T09:30:00Z",
        "updated_at": "2024-01-15T12:00:00Z",
        "subject": "Q4 Planning Review",
        "in_reply_to": null,
        "references": [],
        "thread_position": 0,
        "thread_length": 3
      }
    }
  ],
  "contacts": [
    {
      "email": "alice@example.com",
      "name": "Alice Johnson",
      "aliases": ["Alice J.", "AJ"],
      "communication_style": {
        "sent_count": 15,
        "received_count": 8,
        "cc_count": 3
      },
      "last_interaction": "2024-01-15T09:30:00Z",
      "interaction_count": 26,
      "links": [],
      "_meta": {
        "source_system": "email",
        "updated_at": "2024-01-15T12:00:00Z"
      }
    }
  ],
  "threads_reconstructed": 12,
  "folders_scanned": 2,
  "confidence": 0.89
}
```

## Subagent Integration

For large mailboxes, parallelize across folders:

```yaml
parallel_batch:
  - subagent: email-fetch-worker-1
    folders: [INBOX]
    since: "7d"
  - subagent: email-fetch-worker-2
    folders: [Sent, "[Gmail]/Sent Mail"]
    since: "7d"
  - subagent: email-fetch-worker-3
    folders: [Archive, Projects]
    since: "30d"
```
