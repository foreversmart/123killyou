package linx

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/coder/websocket"
	"nightwatch/internal/session"
)

// Respond uses a bound virtual device and returns both wording and PCM audio.
// Serialize device turns: parallel connections with one identity can interrupt.
func (c *Client) Respond(ctx context.Context, request session.DialogueRequest) (response session.DialogueResponse, err error) {
	role := request.NPCID
	if role == "" {
		role = "keeper"
	}
	request.AgentID, err = c.agentForRole(role)
	if err != nil {
		return response, err
	}
	return c.exchange(ctx, request, "", request.OnSpeech)
}

func (c *Client) Synthesize(ctx context.Context, request session.SpeechRequest, emit session.SpeechSink) (session.DialogueAudio, error) {
	if strings.TrimSpace(request.Text) == "" {
		return session.DialogueAudio{}, errors.New("linx speech text is empty")
	}
	agentID, err := c.agentForRole(request.NPCID)
	if err != nil {
		return session.DialogueAudio{}, err
	}
	response, err := c.exchange(ctx, session.DialogueRequest{AgentID: agentID, PlayerText: "播报本轮已确认的操作结果"}, request.Text, emit)
	if err != nil {
		return session.DialogueAudio{}, err
	}
	return *response.Audio, nil
}

func (c *Client) exchange(ctx context.Context, request session.DialogueRequest, readText string, emit session.SpeechSink) (response session.DialogueResponse, err error) {
	ctx, cancel := context.WithTimeout(ctx, c.config.RequestLimit)
	defer cancel()
	select {
	case c.turns <- struct{}{}:
		defer func() { <-c.turns }()
	case <-ctx.Done():
		return response, ctx.Err()
	}
	defer func() {
		if errors.Is(err, context.Canceled) {
			return // A player's interruption is not a device or credential failure.
		} else if err != nil {
			c.deviceFailure("reply_failed", err)
		} else {
			c.recordReply()
		}
	}()
	if !c.projectAgent(request.AgentID) {
		return response, errors.New("linx target agent is not configured for this project")
	}
	conn, hello, err := c.connect(ctx, request.GameContext, request.AgentID)
	if err != nil {
		return response, err
	}
	defer conn.CloseNow()
	listen := map[string]any{"type": "listen", "state": "detect", "text": request.PlayerText}
	if readText != "" {
		listen["text_response"] = readText
	}
	if hello.SessionID != "" {
		listen["session_id"] = hello.SessionID
	}
	if err = conn.Write(ctx, websocket.MessageText, mustJSON(listen)); err != nil {
		return response, fmt.Errorf("linx listen: %w", err)
	}
	response, err = readReply(ctx, conn, hello.Audio, readText, emit)
	if err == nil && readText != "" && response.Text != strings.TrimSpace(readText) {
		err = errors.New("linx speech did not match the confirmed result")
	}
	return response, err
}

type audioParams struct {
	Format     string `json:"format"`
	SampleRate int    `json:"sample_rate"`
	Channels   int    `json:"channels"`
}

type wireEvent struct {
	Type      string      `json:"type"`
	Transport string      `json:"transport"`
	SessionID string      `json:"session_id"`
	AgentID   string      `json:"agent_id"`
	State     string      `json:"state"`
	Text      string      `json:"text"`
	ErrorCode int         `json:"error_code"`
	Error     string      `json:"error"`
	Aborted   bool        `json:"is_aborted"`
	Audio     audioParams `json:"audio_params"`
}

func clientHello(gameContext string) map[string]any {
	return map[string]any{
		"type": "hello", "version": 1, "transport": "websocket", "features": map[string]any{},
		"audio_params": map[string]any{
			"format": "pcm", "sample_rate": 16000, "channels": 1, "bit_depth": 16,
			"endianness": "little", "frame_duration": 20, "frame_size": 320,
			"sample_format": "signed_int16", "play_buffer_duration": 1000,
		},
		"agent_params": map[string]any{"custom_replace_prompt": map[string]any{"game_context": gameContext}},
	}
}

func readHello(ctx context.Context, conn *websocket.Conn) (wireEvent, error) {
	kind, payload, err := conn.Read(ctx)
	if err != nil {
		return wireEvent{}, fmt.Errorf("linx hello response: %w", err)
	}
	var hello wireEvent
	if kind != websocket.MessageText || json.Unmarshal(payload, &hello) != nil || hello.Type != "hello" || hello.Transport != "websocket" {
		return hello, errors.New("linx returned an invalid hello response")
	}
	if hello.Audio.Format != "pcm" || hello.Audio.Channels != 1 || (hello.Audio.SampleRate != 16000 && hello.Audio.SampleRate != 24000) {
		return hello, errors.New("linx did not negotiate supported mono PCM audio")
	}
	return hello, nil
}

func mustJSON(value any) []byte { raw, _ := json.Marshal(value); return raw }
