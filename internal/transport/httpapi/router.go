// Package httpapi adapts HTTP and WebSocket messages to the session application service.
package httpapi

import (
	"github.com/gin-gonic/gin"

	"nightwatch/internal/game"
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
		c.JSON(200, gin.H{"ok": true, "mode": "demo", "speechProvider": "browser", "qiniuConnected": false, "storage": "sqlite"})
	})
	r.POST("/api/sessions/resume", h.resume)
	r.POST("/api/sessions", h.create)
	r.GET("/api/sessions/:id", h.snapshot)
	r.POST("/api/sessions/:id/commands", h.command)
	r.GET("/api/sessions/:id/stream", h.stream)
	r.NoRoute(serveFrontend)
	return r
}
