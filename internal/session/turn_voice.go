package session

import (
	"context"
	"strings"

	"nightwatch/internal/game"
)

type voicePlan struct {
	NPCID, Reply, GameContext string
	Dialogue                  bool
	BufferedDialogue          bool
	PreviousReplies           []string
	Speaker, Portrait         string
	FallbackCommand           string
	StoryDecision             game.StoryDecision
}

// Preparing a voice plan cannot write checkpoints or fork the real save.
// Explicit actions commit independently of TTS; NPC wording needs Linx first.
type planningTransaction struct{ Transaction }

func (planningTransaction) SaveCheckpoint(SavedCheckpoint) error                 { return nil }
func (planningTransaction) Fork(game.State, game.State, []Memory, []Event) error { return nil }

func (s *Service) planVoice(ctx context.Context, tx Transaction, before game.State, text string) (voicePlan, error) {
	candidate := game.Clone(before)
	candidate.Revision++
	candidate.LastHeard = text
	candidate.Effect = game.Effect{Kind: "none"}
	intent, reply, handled, err := s.control(planningTransaction{tx}, &candidate, before, text)
	plan := voicePlan{Reply: reply, Speaker: "系统"}
	if err != nil {
		return voicePlan{}, err
	}
	if !handled {
		memories, _, historyErr := tx.Context(before.RunID)
		if historyErr != nil {
			return voicePlan{}, historyErr
		}
		decision := s.engine.PrepareStoryDecision(ctx, before, text, describeStoryHistory(memories))
		plan.StoryDecision = decision
		intent, reply = s.engine.ApplyWithDecision(ctx, &candidate, text, decision)
	}
	// When a scene exposes buttons, an ASR paraphrase may be routed as an open
	// dialogue or clarification before the deterministic rules can recognize
	// it. Ask JEV only for those unmatched turns (plus the four-knock scene's
	// intentional silent inspection); recognized story actions remain local.
	needsOptionFallback := (intent == "clarify" || intent == "dead" ||
		(intent == "dialogue" && strings.TrimSpace(reply) == "")) &&
		!game.StoryTextMatchesOption(before, text)
	if before.SceneKey == "mini_four_knocks" && intent == "inspect" &&
		!game.StoryTextMatchesOption(before, text) {
		needsOptionFallback = true
	}
	if before.SceneKey == "mini_ending" && !game.StoryTextMatchesOption(before, text) {
		needsOptionFallback = true
	}
	if needsOptionFallback {
		// ASR often produces a close paraphrase of a visible button. Give JEV
		// the constrained server-side option list only after local matching has
		// failed, then apply the returned canonical command on a fresh state.
		if option := s.engine.PrepareOptionDecision(ctx, before, text); option != nil {
			if command, ok := game.ResolveStoryOption(before, option.Choice); ok {
				fallback := game.Clone(before)
				fallback.Revision++
				fallback.LastHeard = text
				fallback.Effect = game.Effect{Kind: "none"}
				var fallbackHandled bool
				intent, reply, fallbackHandled, err = s.control(planningTransaction{tx}, &fallback, before, command)
				if err != nil {
					return voicePlan{}, err
				}
				if !fallbackHandled {
					intent, reply = s.engine.ApplyWithDecision(ctx, &fallback, command, game.StoryDecision{})
				}
				fallback.LastHeard = text
				candidate = fallback
				plan.FallbackCommand = command
			}
		}
	}
	plan.Reply = reply
	if candidate.Dialogue.Text == reply {
		plan.Speaker, plan.Portrait = candidate.Dialogue.Speaker, candidate.Dialogue.Portrait
		if npcID, known := s.engine.NPCForDialogue(candidate); known {
			plan.NPCID = npcID
		}
	}
	// Authored story lines keep exact TTS; only unmatched, empty story lines
	// request a fresh response to the player's actual words.
	if intent == "dialogue" && !candidate.Caught && (!candidate.StoryMode || reply == "") {
		if npcID, known := s.engine.NPCForDialogue(candidate); known {
			plan.NPCID = npcID
			plan.Dialogue = true
			plan.GameContext = describeDialogueContext(candidate, reply, text)
			plan.BufferedDialogue = candidate.StoryMode
			plan.PreviousReplies = []string{before.Dialogue.Text}
			memories, _, err := tx.Context(before.RunID)
			if err != nil {
				return voicePlan{}, err
			}
			plan.GameContext += describeDialogueHistory(before, plan.NPCID, memories)
			for index := len(memories) - 1; index >= 0 && len(plan.PreviousReplies) < 5; index-- {
				if memories[index].NPC == plan.NPCID {
					plan.PreviousReplies = append(plan.PreviousReplies, memories[index].Reply)
				}
			}
		}
	}
	return plan, nil
}

func (s *Service) generateVoice(ctx context.Context, plan voicePlan, text string, emit SpeechSink) (string, *DialogueAudio, error) {
	if !plan.Dialogue && strings.TrimSpace(plan.Reply) == "" {
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
		providerSink := sink
		if plan.BufferedDialogue {
			providerSink = nil
		}
		response, err := s.provider.Respond(ctx, DialogueRequest{NPCID: plan.NPCID, PlayerText: text, GameContext: plan.GameContext, RuleReply: plan.Reply, OnSpeech: providerSink})
		if ctx.Err() != nil {
			return "", nil, ctx.Err()
		}
		if err != nil || strings.TrimSpace(response.Text) == "" || response.Audio == nil || !validAudio(*response.Audio) {
			return "", nil, ErrLinxUnavailable
		}
		if plan.BufferedDialogue {
			for _, previous := range plan.PreviousReplies {
				if game.Normalize(response.Text) == game.Normalize(previous) {
					return "", nil, ErrDialogueRepeated
				}
			}
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
