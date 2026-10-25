package game

import "testing"

func TestEveryPanelClosesWithShortNarratorFeedback(t *testing.T) {
	engine := panelEngine(t)
	for _, overlay := range []string{"map", "journal", "inventory", "item", "ledger", "help", "settings", "history", "scripture"} {
		for _, command := range []string{"返回", "关闭", "收起"} {
			t.Run(overlay+"/"+command, func(t *testing.T) {
				state := engine.Initial("panel-close")
				state.Overlay, state.FocusItem = overlay, "key"
				intent, speak := engine.Apply(&state, command)
				if intent != "close" || speak != "已关闭。" || state.LastAction != speak || state.Overlay != "" || state.FocusItem != "" {
					t.Fatalf("关闭提示或状态不一致: %s / %+v", intent, state)
				}
				if state.Dialogue != (Dialogue{Speaker: "系统", Text: speak}) || state.SceneKey != "mini_arrival" {
					t.Fatal("关闭面板改变了场景或调用了人物对白")
				}
			})
		}
	}
}
