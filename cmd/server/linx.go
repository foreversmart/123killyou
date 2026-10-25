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
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	voices := map[string]string{"narrator": catalog.Narrator().Voice.ProviderVoiceID}
	for _, npc := range catalog.NPCs() {
		voices[npc.ID] = npc.Voice.ProviderVoiceID
	}
	if err := client.ValidateVoices(ctx, voices); err != nil {
		return nil, fmt.Errorf("灵矽角色音色校验失败: %w", err)
	}
	roles := make(map[string]string, len(voices))
	for _, npc := range catalog.NPCs() {
		agentID, err := client.EnsureAgent(ctx, linx.AgentSpec{
			Name: "1024-" + npc.ID, AssistantName: npc.Name, VoiceID: npc.Voice.ProviderVoiceID,
			SystemPrompt: npc.Prompt + "\n\n后端会通过 {{game_context}} 提供当前事实和本轮结算结果。",
		})
		if err != nil {
			return nil, fmt.Errorf("灵矽角色 %s 准备失败: %w", npc.ID, err)
		}
		roles[npc.ID] = agentID
	}
	narrator := catalog.Narrator()
	narratorID, err := client.EnsureAgent(ctx, linx.AgentSpec{
		Name: "1024-narrator", AssistantName: narrator.Name, VoiceID: narrator.Voice.ProviderVoiceID, SystemPrompt: narrator.Prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("灵矽旁白智能体准备失败: %w", err)
	}
	roles["narrator"] = narratorID
	for role, variable := range map[string]string{"keeper": "LINX_KEEPER_AGENT_ID", "narrator": "LINX_NARRATOR_AGENT_ID"} {
		if configured := os.Getenv(variable); configured != "" && configured != roles[role] {
			return nil, fmt.Errorf("%s 与 1024-%s 不一致", variable, role)
		}
	}
	client.SetRoleAgents(roles)
	if err := client.PrepareDevice(ctx); err != nil {
		return nil, fmt.Errorf("灵矽虚拟设备准备失败: %w", err)
	}
	log.Printf("灵矽虚拟设备完成 OTA 与 1024-keeper 绑定；%d 个独立角色音色已校验并准备，等待实际云端回合验证", len(roles))
	return client, nil
}
