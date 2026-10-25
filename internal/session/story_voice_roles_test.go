package session_test

import (
	"context"
	"fmt"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

func TestStoryActorsKeepAuthoredWordsOwnVoiceAndReplayIdentity(t *testing.T) {
	tests := []struct {
		role, speaker, scene, command string
		flags                         []string
	}{
		{"linlan", "林岚", "mini_arrival", "听第一话", nil},
		{"zhouyan", "周砚", "mini_arrival", "听第一话", []string{"arrival_intro_linlan"}},
		{"xuzhi", "许栀", "mini_arrival", "听第一话", []string{"arrival_intro_linlan", "arrival_intro_zhouyan"}},
		{"keeper", "陆沉", "mini_arrival", "听第一话", []string{"arrival_intro_linlan", "arrival_intro_zhouyan", "arrival_intro_xuzhi"}},
		{"player", "你·心声", "mini_arrival", "听第一话", []string{"arrival_intro_linlan", "arrival_intro_zhouyan", "arrival_intro_xuzhi", "arrival_intro_luchen"}},
		{"huipu", "慧普", "mini_refectory", "问住持", nil},
		{"shangong", "神公", "mini_oracle", "查看杯筊规矩", nil},
	}
	for _, test := range tests {
		t.Run(test.role, func(t *testing.T) {
			repo, err := sqlite.Open(":memory:")
			if err != nil {
				t.Fatal(err)
			}
			defer repo.Close()
			catalog, err := content.Load()
			if err != nil {
				t.Fatal(err)
			}
			provider := &roleProvider{}
			service := session.New(repo, game.NewEngine(catalog), provider)
			state, err := service.Create()
			if err != nil {
				t.Fatal(err)
			}
			state.SceneKey = test.scene
			for _, flag := range test.flags {
				state.Flags[flag] = true
			}
			if err := repo.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) }); err != nil {
				t.Fatal(err)
			}
			var start session.SpeechEvent
			request := fmt.Sprintf("role-%s", test.role)
			result, err := service.CommandStream(context.Background(), state.ID, state.RunID, request, test.command, func(event session.SpeechEvent) error {
				if event.Kind == "start" {
					start = event
				}
				return nil
			})
			if err != nil || !result.HasAudio || result.SpeakerID != test.role || start.Speaker != test.speaker {
				t.Fatalf("错误的故事角色: role=%s start=%+v result=%+v error=%v", test.role, start, result, err)
			}
			if provider.calls != 0 || len(provider.requests) != 1 || provider.requests[0].Text != result.State.Dialogue.Text || provider.requests[0].NPCID != test.role {
				t.Fatal("固定故事台词被 LLM 改写或使用了别人的音色")
			}
			start = session.SpeechEvent{}
			replay, err := service.CommandStream(context.Background(), state.ID, state.RunID, request, test.command, func(event session.SpeechEvent) error {
				if event.Kind == "start" {
					start = event
				}
				return nil
			})
			if err != nil || replay.State.Revision != result.State.Revision || start.Speaker != test.speaker || len(provider.requests) != 1 {
				t.Fatal("音频重放丢失角色或重复推进剧情")
			}
		})
	}
}
