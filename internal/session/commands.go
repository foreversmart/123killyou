package session

import (
	"context"
	"crypto/sha256"
	"fmt"
	"strings"

	"nightwatch/internal/game"
)

func (s *Service) Command(id, runID, requestID, text string) (result game.Result, err error) {
	return s.command(context.Background(), id, runID, requestID, text, nil, nil)
}

func (s *Service) CommandContext(ctx context.Context, id, runID, requestID, text string) (game.Result, error) {
	return s.command(ctx, id, runID, requestID, text, nil, nil)
}

func (s *Service) command(ctx context.Context, id, runID, requestID, text string, emit SpeechSink, action StateSink) (result game.Result, err error) {
	text = strings.TrimSpace(text)
	if runID == "" || requestID == "" || text == "" {
		return result, ErrRequest
	}
	if s.provider == nil {
		return result, ErrLinxUnavailable
	}
	unlock := s.lockCommand(id + "/" + runID + "/" + requestID)
	defer unlock()
	if err := ctx.Err(); err != nil {
		return result, err
	}
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(text)))
	var before game.State
	var plan voicePlan
	err = s.repository.Transaction(func(tx Transaction) error {
		before, err = tx.Current(id)
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
		plan, err = s.planVoice(tx, before, text)
		return err
	})
	if err != nil || result.Type != "" {
		if err == nil {
			if action != nil {
				if err = action(result); err != nil {
					return result, err
				}
			}
			result = s.attachSpeech(ctx, result, audioKey{id, runID, requestID}, nil)
			err = s.replaySpeech(ctx, result, emit)
		}
		return result, err
	}
	var providerReply string
	var providerAudio *DialogueAudio
	// Open NPC wording is generated before its dialogue is committed. Explicit
	// actions are authoritative immediately and must not wait for their TTS.
	if plan.Dialogue {
		providerReply, providerAudio, err = s.generateVoice(ctx, plan, text, emit)
		if err != nil {
			return result, err
		}
	}
	err = s.repository.Transaction(func(tx Transaction) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		current, err := tx.Current(id)
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
		if current.RunID != runID || current.Revision != before.Revision {
			return ErrStaleRun
		}
		before = current
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
			if plan.Dialogue && providerReply != "" && intent == "dialogue" && !next.Caught {
				speak = providerReply
				next.Dialogue.Text = providerReply
				next.LastAction = providerReply
			}
			if err := s.recordProgress(tx, before, next, text, intent, speak); err != nil {
				return err
			}
		}
		next.SavedAt = now()
		if err := tx.SaveState(next); err != nil {
			return err
		}
		result = game.Result{Type: "state", RequestID: requestID, State: next, Speak: speak, Intent: intent, SpeakerID: plan.NPCID}
		if err := ctx.Err(); err != nil {
			return err
		}
		return tx.SaveCommand(id, runID, requestID, StoredCommand{hash, result})
	})
	if err != nil {
		return result, err
	}
	if !plan.Dialogue {
		if action != nil {
			if err = action(result); err != nil {
				return result, err
			}
		}
		_, providerAudio, err = s.generateVoice(ctx, plan, text, emit)
		if err != nil {
			if ctx.Err() != nil {
				return result, ctx.Err()
			}
			result.VoiceError = "操作已完成并保存，但灵矽播报失败。请勿重复交付道具。"
			return result, nil
		}
	}
	return s.attachSpeech(ctx, result, audioKey{id, runID, requestID}, providerAudio), nil
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
