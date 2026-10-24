package sqlite

import "nightwatch/internal/session"

func (t transaction) RecordEvent(runID string, event session.Event) error {
	_, err := t.tx.Exec("INSERT INTO events(run_id,event_id,revision) VALUES(?,?,?)", runID, event.ID, event.Revision)
	return err
}
func (t transaction) AppendMemory(runID string, m session.Memory) error {
	_, err := t.tx.Exec("INSERT INTO npc_memories(run_id,npc_id,revision,player_text,reply_text) VALUES(?,?,?,?,?)", runID, m.NPC, m.Revision, m.Player, m.Reply)
	return err
}
func (t transaction) Context(runID string) ([]session.Memory, []session.Event, error) {
	memories := []session.Memory{}
	events := []session.Event{}
	rows, err := t.tx.Query("SELECT npc_id,revision,player_text,reply_text FROM npc_memories WHERE run_id=? ORDER BY revision,npc_id", runID)
	if err != nil {
		return nil, nil, err
	}
	for rows.Next() {
		var m session.Memory
		if err := rows.Scan(&m.NPC, &m.Revision, &m.Player, &m.Reply); err != nil {
			rows.Close()
			return nil, nil, err
		}
		memories = append(memories, m)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, nil, err
	}
	rows, err = t.tx.Query("SELECT event_id,revision FROM events WHERE run_id=? ORDER BY revision,event_id", runID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var e session.Event
		if err := rows.Scan(&e.ID, &e.Revision); err != nil {
			return nil, nil, err
		}
		events = append(events, e)
	}
	return memories, events, rows.Err()
}
