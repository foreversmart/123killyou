package session

import (
	"context"
	"strings"

	"nightwatch/internal/game"
)

type voicePlan struct {
	NPCID, Reply, GameContext string
	Dialogue                  bool
	Speaker, Portrait         string
}

// Preparing a voice plan cannot write checkpoints or fork the real save.
// Explicit actions commit independently of TTS; NPC wording needs Linx first.
type planningTransaction struct{ Transaction }

func (planningTransaction) SaveCheckpoint(SavedCheckpoint) error                 { return nil }
func (planningTransaction) Fork(game.State, game.State, []Memory, []Event) error { return nil }

func (s *Service) planVoice(tx Transaction, before game.State, text string) (voicePlan, error) {
	candidate := game.Clone(before)
	candidate.Revision++
	candidate.LastHeard = text
	candidate.Effect = game.Effect{Kind: "none"}
	intent, reply, handled, err := s.control(planningTransaction{tx}, &candidate, before, text)
	if err != nil {
		return voicePlan{}, err
	}
	if !handled {
		intent, reply = s.engine.Apply(&candidate, text)
	}
	plan := voicePlan{Reply: reply, Speaker: "系统"}
	if candidate.Dialogue.Text == reply {
		plan.Speaker, plan.Portrait = candidate.Dialogue.Speaker, candidate.Dialogue.Portrait
		if npcID, known := s.engine.NPCForDialogue(candidate); known {
			plan.NPCID = npcID
		}
	}
	// The staged story is authored dialogue. TTS must read that exact character
	// line; open generation remains available for the legacy conversation mode.
	if intent == "dialogue" && !candidate.Caught && !candidate.StoryMode {
		if npcID, known := s.engine.NPCForDialogue(candidate); known {
			plan.NPCID = npcID
			plan.Dialogue = true
			plan.GameContext = describeDialogueContext(candidate, reply)
		}
	}
	return plan, nil
}

func (s *Service) generateVoice(ctx context.Context, plan voicePlan, text string, emit SpeechSink) (string, *DialogueAudio, error) {
	if strings.TrimSpace(plan.Reply) == "" {
		return "", nil, nil
	}
	if s.provider == nil {
		return "", nil, ErrLinxUnavailable
	}
	var sink SpeechSink
	if emit != nil {
		sink = func(event SpeechEvent) error {
			if err := ctx.Err(); err != nil {
				return err
			}
			if event.Kind == "start" {
				event.Speaker, event.Portrait = plan.Speaker, plan.Portrait
			}
			return emit(event)
		}
	}
	if plan.Dialogue {
		response, err := s.provider.Respond(ctx, DialogueRequest{NPCID: plan.NPCID, PlayerText: text, GameContext: plan.GameContext, RuleReply: plan.Reply, OnSpeech: sink})
		if ctx.Err() != nil {
			return "", nil, ctx.Err()
		}
		if err != nil || strings.TrimSpace(response.Text) == "" || response.Audio == nil || !validAudio(*response.Audio) {
			return "", nil, ErrLinxUnavailable
		}
		return strings.TrimSpace(response.Text), response.Audio, nil
	}
	audio, err := s.provider.Synthesize(ctx, SpeechRequest{Text: plan.Reply, NPCID: plan.NPCID}, sink)
	if ctx.Err() != nil {
		return "", nil, ctx.Err()
	}
	if err != nil || !validAudio(audio) {
		return "", nil, ErrLinxUnavailable
	}
	return plan.Reply, &audio, nil
}
