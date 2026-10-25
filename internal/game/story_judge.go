package game

import (
	"context"
	"strings"
)

// MealParticipant is the small, stable slice of an NPC profile needed by the
// story evaluator. Keeping this type in game prevents the HTTP client from
// deciding game rules or importing content files directly.
type MealParticipant struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Traits     []string `json:"traits"`
	Voice      string   `json:"voice,omitempty"`
	LastReply  string   `json:"lastReply,omitempty"`
	MealChoice string   `json:"mealChoice,omitempty"`
}

type MealJudgeRequest struct {
	PlayerText   string            `json:"playerText"`
	Scene        string            `json:"scene"`
	Dialogue     string            `json:"dialogue"`
	History      string            `json:"history,omitempty"`
	Participants []MealParticipant `json:"participants"`
}

// MealDecision uses the values accepted, refused and deferred. "refused"
// means that the NPC has accepted the player's persuasion and will not eat
// meat porridge.
type MealDecision struct {
	Choice     string  `json:"choice"`
	Reply      string  `json:"reply,omitempty"`
	Confidence float64 `json:"confidence,omitempty"`
}

type MealJudgeResult struct {
	Decisions map[string]MealDecision `json:"decisions"`
}

type OracleJudgeRequest struct {
	PlayerText string `json:"playerText"`
	Scene      string `json:"scene"`
	Devotion   int    `json:"devotion"`
	MealChoice string `json:"mealChoice,omitempty"`
	History    string `json:"history,omitempty"`
}

type OracleJudgeResult struct {
	Sincere    bool    `json:"sincere"`
	Score      float64 `json:"score"`
	Confidence float64 `json:"confidence,omitempty"`
}

// StoryOption is a player-facing action that can be selected from the current
// scene. Command remains authoritative: the judge may only choose one of the
// commands supplied by the game.
type StoryOption struct {
	ID          string `json:"id"`
	Command     string `json:"command"`
	Description string `json:"description"`
}

type OptionJudgeRequest struct {
	PlayerText string        `json:"playerText"`
	Scene      string        `json:"scene"`
	Dialogue   string        `json:"dialogue,omitempty"`
	Options    []StoryOption `json:"options"`
}

type OptionJudgeResult struct {
	Choice     string  `json:"choice"`
	Confidence float64 `json:"confidence,omitempty"`
}

// OptionJudge is optional so deployments without JEV retain deterministic
// local matching and explicit clarification.
type OptionJudge interface {
	JudgeOption(context.Context, OptionJudgeRequest) (OptionJudgeResult, error)
}

// RoomAction identifies one of the four visible actions in the fifth scene.
// The game still owns the action's state changes; JEV only maps an otherwise
// unmatched utterance to the closest visible option.
type RoomAction string

const (
	RoomActionCandle    RoomAction = "candle"
	RoomActionHistory   RoomAction = "history"
	RoomActionScripture RoomAction = "scripture"
	RoomActionSleep     RoomAction = "sleep"
)

type RoomActionRequest struct {
	PlayerText string `json:"playerText"`
	Scene      string `json:"scene"`
	SceneText  string `json:"sceneText"`
	Shot       string `json:"shot"`
	CandleLit  bool   `json:"candleLit"`
}

type RoomActionResult struct {
	Action     RoomAction `json:"action"`
	Confidence float64    `json:"confidence,omitempty"`
}

// RoomActionJudge is optional so existing story judges can continue to settle
// meal and oracle decisions. The room classifier is consulted only for an
// unmatched fifth-scene utterance.
type RoomActionJudge interface {
	JudgeRoomAction(context.Context, RoomActionRequest) (RoomActionResult, error)
}

// StoryJudge is intentionally optional. The deterministic story rules remain
// authoritative when the service is not configured or the remote request
// fails.
type StoryJudge interface {
	JudgeMeal(context.Context, MealJudgeRequest) (MealJudgeResult, error)
	JudgeOracle(context.Context, OracleJudgeRequest) (OracleJudgeResult, error)
}

type StoryDecision struct {
	Meal                   *MealJudgeResult
	Oracle                 *OracleJudgeResult
	RoomAction             *RoomActionResult
	RoomActionAttempted    bool
	RoomActionNeedsClarify bool
}

func (e *Engine) SetStoryJudge(judge StoryJudge) {
	e.storyJudge = judge
}

func (e *Engine) PrepareStoryDecision(ctx context.Context, state State, text, history string) StoryDecision {
	decision := StoryDecision{}
	if e.storyJudge == nil {
		return decision
	}
	if state.SceneKey == "mini_refectory" {
		if participants := e.mealJudgeParticipants(state, text); len(participants) > 0 {
			result, err := e.storyJudge.JudgeMeal(ctx, MealJudgeRequest{
				PlayerText:   text,
				Scene:        state.SceneText,
				Dialogue:     state.Dialogue.Text,
				History:      history,
				Participants: participants,
			})
			if err == nil {
				for id, item := range result.Decisions {
					if item.Confidence > 0 && item.Confidence < 0.55 {
						delete(result.Decisions, id)
					}
				}
				decision.Meal = &result
			}
		}
	}
	if state.SceneKey == "mini_oracle" && state.Flags["oracle_sincerity_question"] &&
		!state.Flags["oracle_sincerity_judged"] && !miniHasAny(text, "掷杯", "投杯", "掷筊") {
		result, err := e.storyJudge.JudgeOracle(ctx, OracleJudgeRequest{
			PlayerText: text,
			Scene:      state.SceneText,
			Devotion:   state.Devotion,
			MealChoice: mealChoiceName(state, "player"),
			History:    history,
		})
		if err == nil && (result.Confidence == 0 || result.Confidence >= 0.55) {
			decision.Oracle = &result
		}
	}
	if roomJudge, ok := e.storyJudge.(RoomActionJudge); ok && state.SceneKey == "mini_room" && !roomExplicitCommand(text) {
		decision.RoomActionAttempted = true
		result, err := roomJudge.JudgeRoomAction(ctx, RoomActionRequest{
			PlayerText: text,
			Scene:      state.SceneName,
			SceneText:  state.SceneText,
			Shot:       state.ShotKey,
			CandleLit:  state.Flags["red_candle_lit"],
		})
		if err == nil && validRoomAction(result.Action) && result.Confidence >= 0.55 {
			decision.RoomAction = &result
		} else {
			decision.RoomActionNeedsClarify = true
		}
	}
	return decision
}

func validRoomAction(action RoomAction) bool {
	switch action {
	case RoomActionCandle, RoomActionHistory, RoomActionScripture, RoomActionSleep:
		return true
	default:
		return false
	}
}

func (e *Engine) PrepareOptionDecision(ctx context.Context, state State, text string) *OptionJudgeResult {
	judge, ok := e.storyJudge.(OptionJudge)
	if !ok {
		return nil
	}
	options := StoryOptionChoices(state)
	if len(options) == 0 {
		return nil
	}
	result, err := judge.JudgeOption(ctx, OptionJudgeRequest{
		PlayerText: text,
		Scene:      state.SceneText,
		Dialogue:   state.Dialogue.Text,
		Options:    options,
	})
	if err != nil || (result.Confidence > 0 && result.Confidence < 0.55) {
		return nil
	}
	if _, ok := ResolveStoryOption(state, result.Choice); !ok {
		return nil
	}
	// Normalize the remote option id/label to the server command before it is
	// handed back to the rule engine. The engine remains the only authority
	// that can mutate state.
	result.Choice, _ = ResolveStoryOption(state, result.Choice)
	return &result
}

func ResolveStoryOption(state State, choice string) (string, bool) {
	for _, option := range StoryOptionChoices(state) {
		if Normalize(choice) == Normalize(option.ID) || Normalize(choice) == Normalize(option.Command) {
			return option.Command, true
		}
	}
	return "", false
}

func StoryTextMatchesOption(state State, text string) bool {
	normalized := Normalize(text)
	if normalized == "" {
		return false
	}
	for _, option := range StoryOptionChoices(state) {
		command := Normalize(option.Command)
		if normalized == command || strings.Contains(normalized, command) || strings.Contains(command, normalized) {
			return true
		}
	}
	return false
}

func mealChoiceName(state State, person string) string {
	for _, choice := range []string{"ate", "refused", "deferred"} {
		if state.Flags["meal_"+person+"_"+choice] {
			return choice
		}
	}
	return "unknown"
}

func (e *Engine) mealJudgeParticipants(state State, text string) []MealParticipant {
	if !mealSpeechLooksLikeChoice(text) {
		return nil
	}
	all := miniExactMealGroup(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃", "让大家别吃", "让所有人不吃")
	participants := make([]MealParticipant, 0, 3)
	for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
		npc, ok := e.content.NPC(id)
		if !ok {
			continue
		}
		if all || miniHasAny(text, npc.Name) {
			participants = append(participants, MealParticipant{
				ID: id, Name: npc.Name, Traits: append([]string(nil), npc.Traits...),
				Voice:     npc.Voice.Profile,
				LastReply: state.Dialogue.Text, MealChoice: mealChoiceName(state, id),
			})
		}
	}
	return participants
}

func mealSpeechLooksLikeChoice(text string) bool {
	if miniHasAny(text, "吗", "什么", "为什么", "怎么", "昨天", "刚才", "觉得", "喜欢", "能不能", "要不要", "是否", "如果", "假如", "听说") {
		return false
	}
	return miniHasAny(text, "粥", "肉", "吃", "喝", "馒头", "素菜", "咸菜", "不碰", "别碰", "劝", "说服")
}
