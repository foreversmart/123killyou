package httpapi

import (
	"context"
	"nightwatch/internal/game"
)

type command struct {
	Type      string `json:"type"`
	RunID     string `json:"runId" binding:"required,max=128"`
	RequestID string `json:"requestId" binding:"required,max=128"`
	Text      string `json:"text" binding:"required,max=1000"`
}

func (h handler) executeCommand(ctx context.Context, id string, input command) (game.Result, error) {
	if service, ok := h.sessions.(interface {
		CommandContext(context.Context, string, string, string, string) (game.Result, error)
	}); ok {
		return service.CommandContext(ctx, id, input.RunID, input.RequestID, input.Text)
	}
	return h.sessions.Command(id, input.RunID, input.RequestID, input.Text)
}
