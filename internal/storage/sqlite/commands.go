package sqlite

import (
	"database/sql"
	"encoding/json"
	"errors"

	"nightwatch/internal/session"
)

func (t transaction) FindCommand(id, runID, requestID string) (entry session.StoredCommand, found bool, err error) {
	var raw []byte
	err = t.tx.QueryRow("SELECT input_hash,result_json FROM commands WHERE session_id=? AND run_id=? AND request_id=?", id, runID, requestID).Scan(&entry.InputHash, &raw)
	if errors.Is(err, sql.ErrNoRows) {
		return entry, false, nil
	}
	if err != nil {
		return entry, false, err
	}
	err = json.Unmarshal(raw, &entry.Result)
	return entry, err == nil, err
}
func (t transaction) SaveCommand(id, runID, requestID string, entry session.StoredCommand) error {
	raw, err := json.Marshal(entry.Result)
	if err != nil {
		return err
	}
	_, err = t.tx.Exec("INSERT INTO commands(session_id,run_id,request_id,input_hash,result_json) VALUES(?,?,?,?,?)", id, runID, requestID, entry.InputHash, raw)
	return err
}
