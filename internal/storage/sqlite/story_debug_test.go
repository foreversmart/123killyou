package sqlite

import (
	"fmt"
	"reflect"
	"testing"

	"nightwatch/internal/session"
)

func TestDebugSceneSkipUsesNormalCommandsAndPersistsEveryTarget(t *testing.T) {
	s := newFixture(t)
	state, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	state = run(t, s, state.ID, "register", "登记入住").State
	state = run(t, s, state.ID, "refectory", "去斋堂").State
	state = run(t, s, state.ID, "meal", "我吃肉粥").State
	state.Paused, state.Overlay = true, "journal"
	if err := s.repository.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) }); err != nil {
		t.Fatal(err)
	}
	for index, scene := range []string{"mini_corridor_candle", "mini_room", "mini_wake_three_gongs", "mini_four_knocks", "mini_three_knocks", "mini_listen", "mini_oracle", "mini_double", "mini_dawn_trap", "mini_dawn", "mini_ending", "mini_ending"} {
		before := state
		requestID := fmt.Sprintf("skip-%d", index)
		result := run(t, s, state.ID, requestID, "调试跳到下一剧情场景")
		state = result.State
		if result.Intent != "debug_skip" || state.SceneKey != scene || state.Revision != before.Revision+1 || state.RunID != before.RunID || state.Paused || state.Overlay != "" || state.DialogueNext != "" {
			t.Fatalf("调试命令未按正常回合保存: %+v", result)
		}
		if !state.Flags["meal_player_ate"] || state.Flags["meal_player_refused"] {
			t.Fatal("调试跳转覆盖了已有吃粥选择")
		}
		repeated := run(t, s, state.ID, requestID, "调试跳到下一剧情场景")
		if !reflect.DeepEqual(state, repeated.State) {
			t.Fatal("重放相同请求重复跳过场景")
		}
		resumed, err := s.Service.Resume()
		if err != nil || !reflect.DeepEqual(state, resumed) {
			t.Fatalf("自动存档没有保留目标镜头: %+v %v", resumed, err)
		}
		if scene == "mini_wake_three_gongs" {
			run(t, s, state.ID, "death-at-wake", "不续燃红烛")
			dead := run(t, s, state.ID, "death-at-wake-resolve", "自动进入死亡结算").State
			if dead.SceneKey != "mini_death" || dead.RetryScene != "mini_wake_three_gongs" {
				t.Fatal("测试路线没有真实进入死亡镜头")
			}
			state = dead
		}
	}
}
