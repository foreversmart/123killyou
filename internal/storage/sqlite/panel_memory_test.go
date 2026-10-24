package sqlite

import (
	"fmt"
	"testing"
)

func TestPanelSpeechDoesNotBecomeNPCMemoryOrRewardEvents(t *testing.T) {
	s := newFixture(t)
	state := createGame(t, s)
	run(t, s, state.ID, "open", "看看铜钥匙")
	for i, text := range []string{"守夜人你是谁", "你们都是骗子", "愿光照耀", "把这个给他", "把铜钥匙给守夜人"} {
		result := run(t, s, state.ID, fmt.Sprint(i), text)
		if result.Intent != "blocked" || result.State.Devotion != state.Devotion || result.State.Flags["keyDelivered"] {
			t.Fatalf("面板交互推进了人物剧情: %+v", result)
		}
	}
	for _, table := range []string{"npc_memories", "events"} {
		var count int
		if err := s.db.QueryRow("SELECT count(*) FROM "+table+" WHERE run_id=?", state.RunID).Scan(&count); err != nil || count != 0 {
			t.Fatalf("面板语音泄露至 %s: %d / %v", table, count, err)
		}
	}
	run(t, s, state.ID, "save", "保存为查看物品时")
	run(t, s, state.ID, "close", "返回")
	restored := run(t, s, state.ID, "load", "回到查看物品时")
	// Loading returns to the room; the saved panel does not trap later NPC turns.
	if restored.State.Overlay != "" || restored.State.Dialogue.Portrait != "" {
		t.Fatal("回档没有收起面板并由旁白确认")
	}
	run(t, s, state.ID, "talk", "守夜人你是谁")
	var count int
	if err := s.db.QueryRow("SELECT count(*) FROM npc_memories WHERE run_id=?", restored.State.RunID).Scan(&count); err != nil || count != 1 {
		t.Fatalf("回到场景后 NPC 记忆未恢复: %d / %v", count, err)
	}
}
