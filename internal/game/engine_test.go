package game

import (
	"encoding/json"
	"os"
	"testing"
	"testing/fstest"

	"nightwatch/internal/content"
)

func TestCharacterConfigurationDrivesDialogueAndRewards(t *testing.T) {
	pack := fstest.MapFS{}
	for _, name := range []string{"items.json", "world.json", "npcs/keeper/profile.json", "npcs/keeper/prompt.md"} {
		raw, err := os.ReadFile("../content/" + name)
		if err != nil {
			t.Fatal(err)
		}
		pack[name] = &fstest.MapFile{Data: raw}
	}
	var npc content.NPC
	json.Unmarshal(pack["npcs/keeper/profile.json"].Data, &npc)
	npc.Name = "测试守卫"
	npc.Intro = "先报上身份。"
	npc.DialogueRules[0].DevotionDelta = -5
	npc.DialogueRules[0].Reply = "我记住你了。"
	npc.Exchanges[0].Reply = "凭证拿好。"
	pack["npcs/keeper/profile.json"].Data, _ = json.Marshal(npc)
	catalog, err := content.LoadFS(pack)
	if err != nil {
		t.Fatal(err)
	}
	engine := NewEngine(catalog)
	state := engine.Initial("test")
	if state.Dialogue.Speaker != npc.Name || state.Dialogue.Text != npc.Intro {
		t.Fatal("初始人设未采用配置")
	}
	engine.Apply(&state, "你们都是骗子")
	if state.Devotion != 63 || state.Dialogue.Text != "我记住你了。" {
		t.Fatal("对话规则仍被硬编码")
	}
	intent, _ := engine.Apply(&state, "把铜钥匙给测试守卫")
	if intent != "give" || state.Dialogue.Text != "凭证拿好。" || !state.Flags["keyDelivered"] {
		t.Fatal("配置中的道具交换未生效")
	}
}
