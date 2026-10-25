package content

import (
	"encoding/json"
	"testing"
)

func TestAllStoryCharactersHaveDistinctExplicitVoices(t *testing.T) {
	catalog, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	voices := map[string]string{catalog.Narrator().Voice.ProviderVoiceID: "narrator"}
	for _, id := range []string{"keeper", "player", "linlan", "zhouyan", "xuzhi", "huipu", "shangong"} {
		npc, ok := catalog.NPC(id)
		if !ok || npc.Prompt == "" || npc.Voice.ProviderVoiceID == "" {
			t.Fatalf("角色 %s 缺少可播报配置", id)
		}
		if other := voices[npc.Voice.ProviderVoiceID]; other != "" {
			t.Fatalf("角色 %s 和 %s 共享同一音色", id, other)
		}
		voices[npc.Voice.ProviderVoiceID] = id
	}
}

func TestNPCVoiceCannotSilentlyFallBackToDefault(t *testing.T) {
	pack := testPack(t)
	var profile NPC
	json.Unmarshal(pack["npcs/linlan/profile.json"].Data, &profile)
	profile.Voice.ProviderVoiceID = " "
	pack["npcs/linlan/profile.json"].Data, _ = json.Marshal(profile)
	if _, err := LoadFS(pack); err == nil {
		t.Fatal("NPC 没有真实音色 ID 仍被加载")
	}
}
