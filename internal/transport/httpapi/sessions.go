package httpapi

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func (h handler) resume(c *gin.Context) {
	state, err := h.sessions.Resume()
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(200, state)
}
func (h handler) create(c *gin.Context) {
	state, err := h.sessions.Create()
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(201, state)
}
func (h handler) snapshot(c *gin.Context) {
	state, err := h.sessions.Snapshot(c.Param("id"))
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(200, state)
}
func (h handler) command(c *gin.Context) {
	var input command
	if err := c.ShouldBindJSON(&input); err != nil || strings.TrimSpace(input.Text) == "" {
		c.JSON(400, gin.H{"error": "需要有效的 runId、requestId 和 text。"})
		return
	}
	result, err := h.sessions.Command(c.Param("id"), input.RunID, input.RequestID, input.Text)
	if err != nil {
		writeError(c, err)
		return
	}
	c.JSON(200, result)
}
