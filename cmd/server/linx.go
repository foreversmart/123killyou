package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"nightwatch/internal/content"
	"nightwatch/internal/integration/linx"
	"nightwatch/internal/session"
)

func prepareLinx(catalog *content.Catalog) (session.DialogueProvider, error) {
	apiKey := os.Getenv("LINX_API_KEY")
	if apiKey == "" {
		return nil, errors.New("必须在 .env 配置 LINX_API_KEY 才能启动游戏")
	}
	client := linx.New(linx.Config{
		APIKey: apiKey, APIBase: os.Getenv("LINX_API_BASE"), WSURL: os.Getenv("LINX_WS_URL"),
		OTAURL: os.Getenv("LINX_OTA_URL"), DeviceFile: os.Getenv("LINX_DEVICE_FILE"),
		DeviceID: os.Getenv("LINX_DEVICE_ID"), KeeperAgent: os.Getenv("LINX_KEEPER_AGENT_ID"),
		RequestLimit: 20 * time.Second,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()
	// Always refresh the exact named test agent so {{game_context}} is present.
	keeper, _ := catalog.NPC("keeper")
	agentID, err := client.EnsureAgent(ctx, linx.AgentSpec{
		Name: "1024-keeper", AssistantName: keeper.Name, VoiceID: keeper.Voice.ProviderVoiceID,
		SystemPrompt: keeper.Prompt + "\n\n后端会通过 {{game_context}} 提供当前事实和本轮结算结果。",
	})
	if err != nil {
		return nil, fmt.Errorf("灵矽测试智能体准备失败: %w", err)
	}
	if configured := os.Getenv("LINX_KEEPER_AGENT_ID"); configured != "" && configured != agentID {
		return nil, errors.New("LINX_KEEPER_AGENT_ID 与 1024-keeper 不一致，停止设备绑定")
	}
	client.SetKeeperAgent(agentID)
	if err := client.PrepareDevice(ctx); err != nil {
		return nil, fmt.Errorf("灵矽虚拟设备准备失败: %w", err)
	}
	log.Print("灵矽虚拟设备已完成 OTA 和 1024-keeper 绑定；等待实际云端回合验证")
	return client, nil
}
