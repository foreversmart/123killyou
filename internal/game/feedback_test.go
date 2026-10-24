package game

import (
	"reflect"
	"strings"
	"testing"

	"nightwatch/internal/content"
)

func TestSpeechRoutesToCloudDialogueOrExplicitRuleFeedbackWithoutStoryChanges(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	engine := NewEngine(catalog)
	for _, test := range []struct {
		name, setup, text, intent string
	}{
		{"off topic", "", "我今天吃了一整个西瓜", "dialogue"},
		{"nonsense", "", "咕噜叽里呱啦abcxyz", "dialogue"},
		{"after exchange", "把铜钥匙给守夜人", "我想聊聊宇宙飞船", "dialogue"},
		{"no listener", "去走廊", "今天的晚饭真好吃", "clarify"},
		{"ambiguous item", "", "把这个给他", "clarify"},
		{"missing recipient", "去走廊", "把铜钥匙给守夜人", "blocked"},
		{"locked room", "", "去内堂", "blocked"},
	} {
		t.Run(test.name, func(t *testing.T) {
			state := engine.Initial("feedback-test")
			if test.setup != "" {
				engine.Apply(&state, test.setup)
			}
			before := Clone(state)
			intent, speak := engine.Apply(&state, test.text)
			if intent != test.intent || (intent != "dialogue" && strings.TrimSpace(speak) == "") || state.LastAction != speak {
				t.Fatalf("没有明确回应: intent=%q speak=%q", intent, speak)
			}
			if intent == "dialogue" {
				if state.Dialogue.Speaker != "守夜人" || state.Dialogue.Text != speak {
					t.Fatal("跑题未由当前 NPC 回应")
				}
				if speak != "" {
					t.Fatal("普通闲聊不应产生本地替代台词")
				}
			}
			state.Dialogue, state.LastAction = before.Dialogue, before.LastAction
			if !reflect.DeepEqual(state, before) {
				t.Fatal("跑题、澄清或失败操作改变了剧情状态")
			}
		})
	}
}
