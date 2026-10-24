package session

import (
	"crypto/sha256"
	"fmt"
	"strings"

	"nightwatch/internal/game"
)

func (s *Service) Command(id, runID, requestID, text string) (result game.Result, err error) {
	text = strings.TrimSpace(text)
	if runID == "" || requestID == "" || text == "" {
		return result, ErrRequest
	}
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(text)))
	err = s.repository.Transaction(func(tx Transaction) error {
		before, err := tx.Current(id)
		if err != nil {
			return err
		}
		previous, found, err := tx.FindCommand(id, runID, requestID)
		if err != nil {
			return err
		}
		if found {
			if previous.InputHash != hash {
				return ErrRequest
			}
			result = previous.Result
			return nil
		}
		if before.RunID != runID {
			return ErrStaleRun
		}
		next := game.Clone(before)
		next.Revision++
		next.LastHeard = text
		next.Effect = game.Effect{Kind: "none"}
		intent, speak, handled, err := s.control(tx, &next, before, text)
		if err != nil {
			return err
		}
		if !handled {
			intent, speak = s.engine.Apply(&next, text)
			if err := s.recordProgress(tx, before, next, text, intent, speak); err != nil {
				return err
			}
		}
		next.SavedAt = now()
		if err := tx.SaveState(next); err != nil {
			return err
		}
		result = game.Result{Type: "state", RequestID: requestID, State: next, Speak: speak, Intent: intent}
		return tx.SaveCommand(id, runID, requestID, StoredCommand{hash, result})
	})
	return
}
func (s *Service) recordProgress(tx Transaction, before, next game.State, text, intent, speak string) error {
	for key, value := range next.Flags {
		if value && !before.Flags[key] {
			if err := tx.RecordEvent(next.RunID, Event{key, next.Revision}); err != nil {
				return err
			}
		}
	}
	if next.Caught && !before.Caught {
		if err := tx.RecordEvent(next.RunID, Event{"identity_exposed", next.Revision}); err != nil {
			return err
		}
	}
	npcID, known := s.engine.NPCForDialogue(next)
	if known && next.Dialogue.Text == speak && (next.Dialogue != before.Dialogue || intent == "dialogue" || intent == "give") {
		return tx.AppendMemory(next.RunID, Memory{npcID, next.Revision, text, speak})
	}
	return nil
}
