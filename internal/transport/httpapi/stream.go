package httpapi

import (
	"context"
	"strings"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/gin-gonic/gin"

	"nightwatch/internal/game"
)

func (h handler) stream(c *gin.Context) {

	id := c.Param("id")
	state, err := h.sessions.Snapshot(id)
	if err != nil {
		writeError(c, err)
		return
	}
	conn, err := websocket.Accept(c.Writer, c.Request, &websocket.AcceptOptions{
		OriginPatterns: []string{"localhost:*", "127.0.0.1:*"},
	})
	if err != nil {
		return
	}
	defer conn.CloseNow()
	conn.SetReadLimit(8192)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := wsjson.Write(ctx, conn, game.Result{Type: "state", State: state}); err != nil {
		return
	}
	for {
		var input command
		if err := wsjson.Read(ctx, conn, &input); err != nil {
			return
		}
		if input.Type != "command" || input.RunID == "" || len(input.RunID) > 128 || input.RequestID == "" || len(input.RequestID) > 128 || strings.TrimSpace(input.Text) == "" || len([]rune(input.Text)) > 1000 {
			if err := wsjson.Write(ctx, conn, game.Result{Type: "error", RequestID: input.RequestID, Error: "需要有效的 runId、requestId 和 text。"}); err != nil {
				return
			}
			continue
		}
		result, err := h.sessions.Command(id, input.RunID, input.RequestID, input.Text)
		if err != nil {
			_, message := publicError(err)
			current, _ := h.sessions.Snapshot(id)
			if err := wsjson.Write(ctx, conn, game.Result{Type: "error", RequestID: input.RequestID, State: current, Error: message}); err != nil {
				return
			}
			continue
		}
		if err := wsjson.Write(ctx, conn, result); err != nil {
			return
		}
	}
}
