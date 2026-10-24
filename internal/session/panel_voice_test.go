package session_test

import (
	"context"
	"fmt"
	"testing"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

func TestPanelTurnsUseNarratorForLiveSpeechAndRetries(t *testing.T) {
	for _, open := range []string{"看看地图", "看看账本", "看看铜钥匙", "看看手记", "打开背包", "帮助", "设置"} {
		t.Run(open, func(t *testing.T) {
			p := &roleProvider{fakeDialogueProvider: fakeDialogueProvider{text: "我在这里。"}}
			service := audioService(t, p)
			state, err := service.Resume()
			if err != nil {
				t.Fatal(err)
			}
			for i, text := range []string{open, "你们都是骗子", "把铜钥匙给守夜人", "看看地图", "保存为面板检查", "返回"} {
				requestID := fmt.Sprint(i)
				before := state
				var first game.Result
				for attempt := 0; attempt < 2; attempt++ {
					var start session.SpeechEvent
					result, err := service.CommandStream(context.Background(), before.ID, before.RunID, requestID, text, func(event session.SpeechEvent) error {
						if event.Kind == "start" {
							start = event
						}
						return nil
					})
					if err != nil || result.SpeakerID != "" || !result.HasAudio || start.Speaker != "系统" || start.Portrait != "" {
						t.Fatalf("旁白流或重放角色错误: %+v / %+v / %v", result, start, err)
					}
					if result.State.Dialogue != (game.Dialogue{Speaker: "系统", Text: result.Speak}) {
						t.Fatal("流式旁白与持久化对白不一致")
					}
					if attempt == 0 {
						first = result
					} else if first.State.Revision != result.State.Revision {
						t.Fatal("重试重复结算面板操作")
					}
					state = result.State
				}
			}
			if p.calls != 0 || len(p.requests) != 6 {
				t.Fatal("面板操作调用了 NPC，或重试重复生成音频")
			}
			for _, request := range p.requests {
				if request.NPCID != "" {
					t.Fatalf("面板操作选择了人物音色: %+v", request)
				}
			}
			result, err := service.Command(state.ID, state.RunID, "npc", "守夜人你是谁")
			if err != nil || result.SpeakerID != "keeper" || p.calls != 1 || p.seen.NPCID != "keeper" {
				t.Fatalf("关闭面板后未恢复云端 NPC: %+v / %v", result, err)
			}
		})
	}
}
