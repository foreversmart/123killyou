package session

import (
	"context"
	"errors"
)

// DialogueRequest contains only facts the model needs for the current turn.
// The provider must treat the local game state as authoritative and cannot
// grant items, change devotion, or perform movement by itself.
type DialogueRequest struct {
	NPCID       string
	AgentID     string
	PlayerText  string
	GameContext string
	RuleReply   string
	OnSpeech    SpeechSink
}

type DialogueResponse struct {
	Text  string
	Audio *DialogueAudio
}

// DialogueAudio is transient mono signed 16-bit little-endian PCM, not a save.
type DialogueAudio struct {
	PCM        []byte
	SampleRate int
}

// Empty NPCID selects the system narrator. NPC lines keep their own voice,
// including rule-authored rewards, refusals and room greetings.
type SpeechRequest struct {
	Text  string
	NPCID string
}

type DialogueProvider interface {
	Respond(context.Context, DialogueRequest) (DialogueResponse, error)
	Synthesize(context.Context, SpeechRequest, SpeechSink) (DialogueAudio, error)
}

var ErrLinxUnavailable = errors.New("灵矽暂不可用，本轮操作未完成，请稍后重试。")

type DialogueStatus struct {
	State       string `json:"state"`
	Bound       bool   `json:"bound"`
	Verified    bool   `json:"verified"`
	LastReplyAt string `json:"lastReplyAt,omitempty"`
	LastError   string `json:"lastError,omitempty"`
}

func (s *Service) DialogueStatus() DialogueStatus {
	if provider, ok := s.provider.(interface{ DialogueStatus() DialogueStatus }); ok {
		return provider.DialogueStatus()
	}
	return DialogueStatus{State: "disabled"}
}
