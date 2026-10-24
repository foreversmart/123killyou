CREATE TABLE sessions (id TEXT PRIMARY KEY, current_run TEXT NOT NULL);
CREATE TABLE slots (name TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id));
CREATE TABLE runs (
 id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id),
 parent_id TEXT, archived INTEGER NOT NULL DEFAULT 0, state_json BLOB NOT NULL
);
CREATE TABLE commands (
 session_id TEXT NOT NULL REFERENCES sessions(id), run_id TEXT NOT NULL REFERENCES runs(id),
 request_id TEXT NOT NULL, input_hash TEXT NOT NULL, result_json BLOB NOT NULL,
 PRIMARY KEY(run_id, request_id)
);
CREATE TABLE events (
 run_id TEXT NOT NULL REFERENCES runs(id), event_id TEXT NOT NULL, revision INTEGER NOT NULL,
 PRIMARY KEY(run_id, event_id)
);
CREATE TABLE npc_memories (
 run_id TEXT NOT NULL REFERENCES runs(id), npc_id TEXT NOT NULL, revision INTEGER NOT NULL,
 player_text TEXT NOT NULL, reply_text TEXT NOT NULL, PRIMARY KEY(run_id, npc_id, revision)
);
CREATE TABLE checkpoints (
 session_id TEXT NOT NULL REFERENCES sessions(id), name TEXT NOT NULL,
 source_run TEXT NOT NULL REFERENCES runs(id), data_json BLOB NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(session_id, name)
);
PRAGMA user_version=1;
