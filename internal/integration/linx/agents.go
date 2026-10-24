package linx

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strings"
)

// EnsureAgent finds or creates one named agent. Names are exact so a test
// agent cannot accidentally mutate another user's agent with a similar name.
func (c *Client) EnsureAgent(ctx context.Context, spec AgentSpec) (string, error) {
	if !c.Configured() {
		return "", errors.New("linx api key is not configured")
	}
	if strings.TrimSpace(spec.Name) == "" || !strings.HasPrefix(spec.Name, "1024-") {
		return "", errors.New("linx test agent name must start with 1024-")
	}
	if spec.VoiceID == "" {
		spec.VoiceID = DefaultVoiceID
	}
	if spec.ModelID == "" {
		spec.ModelID = DefaultModelID
	}
	var cursor string
	for {
		var items []Agent
		nextCursor, err := c.requestWithMeta(ctx, http.MethodGet, "/xiaozhi/agent/list?limit=100"+cursorParam(cursor), nil, &items)
		if err != nil {
			return "", err
		}
		for _, agent := range items {
			if agent.AgentName != spec.Name {
				continue
			}
			if err := c.updateAgent(ctx, agent.ID, spec); err != nil {
				return "", err
			}
			return agent.ID, nil
		}
		if nextCursor == "" {
			break
		}
		cursor = nextCursor
	}
	var created string
	body := map[string]any{
		"agentName": spec.Name, "assistantName": spec.AssistantName, "langCode": "zh",
		"ttsVoiceId": spec.VoiceID, "systemPrompt": spec.SystemPrompt, "llmModelId": spec.ModelID,
		"memModelId": "Memory_nomem", "intentModelId": "",
	}
	if err := c.request(ctx, http.MethodPost, "/xiaozhi/agent", body, &created); err != nil {
		return "", err
	}
	if created == "" {
		return "", errors.New("linx did not return an agent id")
	}
	if err := c.updateAgent(ctx, created, spec); err != nil {
		return "", err
	}
	return created, nil
}

func (c *Client) updateAgent(ctx context.Context, id string, spec AgentSpec) error {
	body := map[string]any{
		"assistantName": spec.AssistantName, "ttsVoiceId": spec.VoiceID,
		"llmModelId": spec.ModelID, "memModelId": "Memory_nomem", "systemPrompt": spec.SystemPrompt,
		"extra": map[string]any{
			"disable_greeting": true,
			"llm":              map[string]any{"temperature": 0.65, "top_p": 0.85, "max_tokens": 256},
		},
	}
	return c.request(ctx, http.MethodPut, "/xiaozhi/agent/"+id, body, nil)
}

func cursorParam(cursor string) string {
	if cursor == "" {
		return ""
	}
	return "&cursor=" + url.QueryEscape(cursor)
}
