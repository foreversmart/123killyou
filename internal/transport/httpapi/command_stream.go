package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

// Each turn has its own cancellable HTTP stream. A browser can interrupt it
// immediately instead of waiting behind the previous WebSocket command.
func (h handler) commandStream(c *gin.Context) {
	var input command
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.Text) == "" {
		c.JSON(400, gin.H{"error": "需要有效的 runId、requestId 和 text。"})
		return
	}
	ctx := c.Request.Context()
	c.Header("Content-Type", "application/x-ndjson")
	c.Header("Cache-Control", "no-store")
	c.Header("X-Accel-Buffering", "no")
	c.Header("X-Content-Type-Options", "nosniff")
	writer := http.NewResponseController(c.Writer)
	write := func(value any) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		// A slow/disconnected consumer must not hold the device turn forever.
		_ = writer.SetWriteDeadline(time.Now().Add(5 * time.Second))
		if err := json.NewEncoder(c.Writer).Encode(value); err != nil {
			return err
		}
		return writer.Flush()
	}
	emit := func(event session.SpeechEvent) error {
		return write(struct {
			Type      string              `json:"type"`
			RequestID string              `json:"requestId"`
			Speech    session.SpeechEvent `json:"speech"`
		}{"speech", input.RequestID, event})
	}
	var result game.Result
	var err error
	if service, ok := h.sessions.(interface {
		CommandLive(context.Context, string, string, string, string, session.SpeechSink, session.StateSink) (game.Result, error)
	}); ok {
		result, err = service.CommandLive(ctx, c.Param("id"), input.RunID, input.RequestID, input.Text, emit, func(committed game.Result) error {
			committed.Type = "action"
			return write(committed)
		})
	} else {
		result, err = h.executeCommand(ctx, c.Param("id"), input)
	}
	if ctx.Err() != nil {
		return
	}
	if err != nil {
		_, message := publicError(err)
		state, _ := h.sessions.Snapshot(c.Param("id"))
		result = game.Result{Type: "error", RequestID: input.RequestID, State: state, Error: message}
	}
	_ = write(result)
}
