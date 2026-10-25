package game

import (
	"reflect"
	"testing"

	"nightwatch/internal/content"
)

func panelEngine(t *testing.T) *Engine {
	t.Helper()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	return NewEngine(catalog)
}

func TestEveryInformationPanelBlocksNPCDialogueAndHandover(t *testing.T) {
	engine := panelEngine(t)
	for _, open := range []string{"看看地图", "看看账本", "看看铜钥匙", "看看手记", "打开背包", "帮助", "设置"} {
		t.Run(open, func(t *testing.T) {
			state := ruleState(engine, "panels")
			engine.Apply(&state, open)
			if state.Overlay == "" || state.Dialogue.Speaker != "系统" || state.Dialogue.Portrait != "" {
				t.Fatalf("面板未由无头像旁白打开: %+v", state)
			}
			before := Clone(state)
			for _, text := range []string{"守夜人你是谁", "你们都是骗子", "愿光照耀", "把铜钥匙给守夜人", "把这个给他", "今天的西瓜很好吃"} {
				intent, speak := engine.Apply(&state, text)
				if intent != "blocked" || speak == "" || state.Dialogue != (Dialogue{Speaker: "系统", Text: speak}) {
					t.Fatalf("面板内交互未由旁白提示关闭: %s / %+v", text, state.Dialogue)
				}
				state.Dialogue, state.LastAction = before.Dialogue, before.LastAction
				if !reflect.DeepEqual(state, before) {
					t.Fatalf("面板内交互改变了剧情或物品: %s", text)
				}
			}
		})
	}
}

func TestPanelNavigationAndClosingRestoreWorldInteraction(t *testing.T) {
	engine := panelEngine(t)
	state := ruleState(engine, "navigation")
	for _, step := range []struct{ text, overlay string }{
		{"打开背包", "inventory"}, {"看看铜钥匙", "item"},
		{"看看手记", "journal"}, {"看看账本", "ledger"},
		{"看看地图", "map"}, {"设置", "settings"}, {"帮助", "help"}, {"返回", ""},
	} {
		_, speak := engine.Apply(&state, step.text)
		if state.Overlay != step.overlay || state.Dialogue != (Dialogue{Speaker: "系统", Text: speak}) {
			t.Fatalf("面板导航丢失旁白或目标: %s / %+v", step.text, state)
		}
	}
	if state.FocusItem != "" {
		t.Fatal("关闭后残留物品焦点")
	}
	engine.Apply(&state, "你是谁")
	if npcID, ok := engine.NPCForDialogue(state); !ok || npcID != "keeper" {
		t.Fatal("关闭面板后未恢复人物对话")
	}
	engine.Apply(&state, "把铜钥匙给守夜人")
	if !state.Flags["keyDelivered"] || state.Overlay != "" || state.Dialogue.Speaker != "守夜人" {
		t.Fatal("正常交付应保留 NPC 回应，不弹出详情遮挡对话")
	}
	engine.Apply(&state, "看看通行凭")
	if state.Overlay != "item" || state.FocusItem != "permit" || state.Dialogue.Portrait != "" {
		t.Fatal("奖励不能由旁白查看")
	}
}

func TestMovementFromPanelUsesNarratorBeforeNextNPCInteraction(t *testing.T) {
	engine := panelEngine(t)
	state := ruleState(engine, "movement")
	for _, text := range []string{"看看铜钥匙", "去走廊", "看看地图", "回休息室"} {
		intent, speak := engine.Apply(&state, text)
		if state.Dialogue != (Dialogue{Speaker: "系统", Text: speak}) {
			t.Fatalf("移动与面板交互调用了 NPC: %s", text)
		}
		if intent == "move" && (state.Overlay != "" || state.FocusItem != "") {
			t.Fatal("移动没有收起面板及其焦点")
		}
	}
	engine.Apply(&state, "守夜人你是谁")
	if state.Dialogue.Speaker != "守夜人" {
		t.Fatal("到达后下一轮未恢复 NPC 交互")
	}
}
