// Package httpapi adapts HTTP and WebSocket messages to the session application service.
package httpapi

import (
	"github.com/gin-gonic/gin"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

type SessionService interface {
	Resume() (game.State, error)
	Create() (game.State, error)
	Snapshot(string) (game.State, error)
	Command(string, string, string, string) (game.Result, error)
}
type handler struct{ sessions SessionService }

func NewRouter(sessions SessionService) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.SetTrustedProxies(nil)
	h := handler{sessions: sessions}
	r.GET("/api/health", func(c *gin.Context) {
		speechProvider := "unavailable"
		qiniuConnected := false
		linxStatus := session.DialogueStatus{State: "disabled"}
		if provider, ok := sessions.(interface {
			SpeechProvider() string
			LinxConnected() bool
		}); ok {
			speechProvider = provider.SpeechProvider()
			qiniuConnected = provider.LinxConnected()
		}
		if provider, ok := sessions.(interface{ DialogueStatus() session.DialogueStatus }); ok {
			linxStatus = provider.DialogueStatus()
		}
		c.JSON(200, gin.H{"ok": true, "mode": "demo", "speechProvider": speechProvider, "qiniuConnected": qiniuConnected, "linx": linxStatus, "storage": "sqlite"})
	})
	r.POST("/api/sessions/resume", h.resume)
	r.POST("/api/sessions", h.create)
	r.GET("/api/sessions/:id", h.snapshot)
	r.POST("/api/sessions/:id/commands", h.command)
	r.POST("/api/sessions/:id/commands/stream", h.commandStream)
	r.GET("/api/sessions/:id/stream", h.stream)
	r.GET("/api/sessions/:id/recognition", h.recognize)
	r.GET("/api/sessions/:id/runs/:runId/audio/:requestId", h.audio)
	r.NoRoute(serveFrontend)
	return r
}
