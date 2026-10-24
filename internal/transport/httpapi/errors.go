package httpapi

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"nightwatch/internal/session"
)

func publicError(err error) (int, string) {
	switch {
	case errors.Is(err, session.ErrLinxUnavailable):
		return http.StatusServiceUnavailable, session.ErrLinxUnavailable.Error()
	case errors.Is(err, session.ErrSession):
		return http.StatusNotFound, "会话不存在，请重新进入游戏。"
	case errors.Is(err, session.ErrStaleRun), errors.Is(err, session.ErrRequest), errors.Is(err, session.ErrSaveFormat):
		return http.StatusConflict, err.Error()
	default:
		log.Printf("本地存档操作失败: %v", err)
		return http.StatusServiceUnavailable, "本地存档暂不可用，操作未完成，请重试。"
	}
}

func writeError(c *gin.Context, err error) {
	status, message := publicError(err)
	c.JSON(status, gin.H{"error": message})
}
