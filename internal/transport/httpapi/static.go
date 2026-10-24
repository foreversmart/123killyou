package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func serveFrontend(c *gin.Context) {

	if strings.HasPrefix(c.Request.URL.Path, "/api/") {
		c.JSON(404, gin.H{"error": "接口不存在。"})
		return
	}
	if c.Request.Method != http.MethodGet && c.Request.Method != http.MethodHead {
		c.Status(405)
		return
	}
	cleanPath := filepath.Clean("/" + c.Request.URL.Path)
	assetPath := filepath.Join("dist", cleanPath)
	if info, err := os.Stat(assetPath); err == nil && !info.IsDir() {
		c.File(assetPath)
		return
	}
	if _, err := os.Stat("dist/index.html"); err != nil {
		c.String(404, "网页尚未构建。开发请运行 npm run dev；构建请运行 npm run build。")
		return
	}
	if filepath.Ext(cleanPath) != "" {
		c.Status(404)
		return
	}
	c.File("dist/index.html")
}
