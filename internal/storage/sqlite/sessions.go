package sqlite

import (
	"database/sql"
	"errors"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

func (t transaction) Current(id string) (game.State, error) {
	var raw []byte
	err := t.tx.QueryRow(`SELECT r.state_json FROM sessions s JOIN runs r ON r.id=s.current_run WHERE s.id=? AND r.archived=0`, id).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return game.State{}, session.ErrSession
	}
	if err != nil {
		return game.State{}, err
	}
	return session.DecodeState(raw)
}
func (t transaction) AutoSave() (game.State, error) {
	var id string
	err := t.tx.QueryRow("SELECT session_id FROM slots WHERE name='auto'").Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return game.State{}, session.ErrSession
	}
	if err != nil {
		return game.State{}, err
	}
	return t.Current(id)
}
func (t transaction) CreateSession(state game.State) error {
	raw, err := session.EncodeState(state)
	if err != nil {
		return err
	}
	if _, err := t.tx.Exec("INSERT INTO sessions(id,current_run) VALUES(?,?)", state.ID, state.RunID); err != nil {
		return err
	}
	if _, err := t.tx.Exec("INSERT INTO runs(id,session_id,state_json) VALUES(?,?,?)", state.RunID, state.ID, raw); err != nil {
		return err
	}
	_, err = t.tx.Exec("INSERT INTO slots(name,session_id) VALUES('auto',?) ON CONFLICT(name) DO UPDATE SET session_id=excluded.session_id", state.ID)
	return err
}
func (t transaction) SaveState(state game.State) error {
	raw, err := session.EncodeState(state)
	if err != nil {
		return err
	}
	_, err = t.tx.Exec("UPDATE runs SET state_json=? WHERE id=?", raw, state.RunID)
	return err
}
func (t transaction) Fork(before, next game.State, memories []session.Memory, events []session.Event) error {
	raw, err := session.EncodeState(next)
	if err != nil {
		return err
	}
	if _, err := t.tx.Exec("INSERT INTO runs(id,session_id,parent_id,state_json) VALUES(?,?,?,?)", next.RunID, next.ID, before.RunID, raw); err != nil {
		return err
	}
	if _, err := t.tx.Exec("UPDATE runs SET archived=1 WHERE id=?", before.RunID); err != nil {
		return err
	}
	if _, err := t.tx.Exec("UPDATE sessions SET current_run=? WHERE id=?", next.RunID, next.ID); err != nil {
		return err
	}
	for _, m := range memories {
		if err := t.AppendMemory(next.RunID, m); err != nil {
			return err
		}
	}
	for _, e := range events {
		if err := t.RecordEvent(next.RunID, e); err != nil {
			return err
		}
	}
	return nil
}
