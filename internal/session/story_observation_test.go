package session_test

import (
	"context"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

func TestStoryObservationsCommitAndReplayWithoutSpeech(t *testing.T) {
	for _, test := range []struct{ scene, command string }{
		{"mini_room", "点燃红烛"},
		{"mini_room", "读寺史"},
		{"mini_room", "检查门闩"},
		{"mini_four_knocks", "看门眼"},
		{"mini_oracle", "检查鸟笼"},
	} {
		t.Run(test.command, func(t *testing.T) {
			repo, err := sqlite.Open(":memory:")
			if err != nil {
				t.Fatal(err)
			}
			defer repo.Close()
			catalog, err := content.Load()
			if err != nil {
				t.Fatal(err)
			}
			provider := &roleProvider{fail: true}
			service := session.New(repo, game.NewEngine(catalog), provider)
			state, err := service.Create()
			if err != nil {
				t.Fatal(err)
			}
			state.SceneKey = test.scene
			state.Flags["red_candle_held"] = true
			if err := repo.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) }); err != nil {
				t.Fatal(err)
			}
			for attempt := 0; attempt < 2; attempt++ {
				result, err := service.CommandStream(context.Background(), state.ID, state.RunID, "observe", test.command, func(event session.SpeechEvent) error {
					t.Fatalf("环境观察进入了语音流: %+v", event)
					return nil
				})
				if err != nil || result.Speak != "" || result.HasAudio || result.VoiceError != "" {
					t.Fatalf("环境观察被合成语音或误报失败: %+v %v", result, err)
				}
				if result.State.Revision != state.Revision+1 || result.State.SceneText == "" || result.State.LastAction == "" || result.State.Dialogue != (game.Dialogue{}) {
					t.Fatalf("环境反馈丢失或重试重复推进: %+v", result.State)
				}
			}
			if len(provider.requests) != 0 {
				t.Fatal("无对白镜头调用了 TTS")
			}
		})
	}
}
