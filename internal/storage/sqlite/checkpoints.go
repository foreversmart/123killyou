package sqlite

import (
	"database/sql"
	"encoding/json"
	"errors"

	"nightwatch/internal/session"
)

func (t transaction) Checkpoint(id, name string) (entry session.SavedCheckpoint, found bool, err error) {
	var raw []byte
	entry.SessionID, entry.Name = id, name
	err = t.tx.QueryRow("SELECT source_run,data_json,created_at FROM checkpoints WHERE session_id=? AND name=?", id, name).Scan(&entry.SourceRun, &raw, &entry.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return entry, false, nil
	}
	if err != nil {
		return entry, false, err
	}
	err = json.Unmarshal(raw, &entry.Data)
	return entry, err == nil, err
}
func (t transaction) SaveCheckpoint(entry session.SavedCheckpoint) error {
	raw, err := json.Marshal(entry.Data)
	if err != nil {
		return err
	}
	_, err = t.tx.Exec("INSERT INTO checkpoints(session_id,name,source_run,data_json,created_at) VALUES(?,?,?,?,?)", entry.SessionID, entry.Name, entry.SourceRun, raw, entry.CreatedAt)
	return err
}
func (t transaction) CheckpointNames(id string) ([]string, error) {
	rows, err := t.tx.Query("SELECT name FROM checkpoints WHERE session_id=? ORDER BY created_at DESC LIMIT 8", id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	names := []string{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		names = append(names, name)
	}
	return names, rows.Err()
}
