package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
	"nightwatch/internal/transport/httpapi"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8787"
	}
	dbPath := os.Getenv("NIGHTWATCH_DB")
	if dbPath == "" {
		dbPath = ".local/data/nightwatch.db"
	}
	catalog, err := content.Load()
	if err != nil {
		log.Fatalf("角色配置无效: %v", err)
	}
	repository, err := sqlite.Open(dbPath)
	if err != nil {
		log.Fatalf("无法打开本地存档: %v", err)
	}
	defer repository.Close()
	sessions := session.New(repository, game.NewEngine(catalog))
	server := &http.Server{Addr: "127.0.0.1:" + port, Handler: httpapi.NewRouter(sessions), ReadHeaderTimeout: 5 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		log.Printf("Gin 本地演示服务：http://127.0.0.1:%s（七牛尚未接入）", port)
		log.Printf("SQLite 自动存档：%s；已加载 %d 个 NPC 配置", dbPath, len(catalog.NPCs()))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()
	<-ctx.Done()
	shutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdown); err != nil {
		log.Print(err)
	}
}
