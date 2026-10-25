package sqlite

import (
	"fmt"
	"testing"
)

func TestStoryRelightAndRepeatedSafeRetriesPersist(t *testing.T) {
	s := newFixture(t)
	state, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	commands := []string{
		"登记入住", "去斋堂", "劝大家不要吃粥", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下",
		"不续燃红烛", "从最近安全节点重试", "不续燃红烛", "从最近安全节点重试", "续燃红烛",
	}
	for index, command := range commands {
		state = run(t, s, state.ID, fmt.Sprint(index), command).State
	}
	if state.SceneKey != "mini_four_knocks" || !state.Flags["red_candle_lit"] || state.Flags["story_dead"] {
		t.Fatalf("重复死亡重试与续烛未正确保存: %+v", state)
	}
	resumed, err := s.Service.Resume()
	if err != nil || resumed.Revision != state.Revision || resumed.ShotKey != "four_knocks" {
		t.Fatalf("后续场景没有写入自动存档: %+v %v", resumed, err)
	}
	for _, event := range []string{"red_candle_lit", "story_dead"} {
		var count, firstRevision int
		if err := s.db.QueryRow("SELECT count(*),min(revision) FROM events WHERE run_id=? AND event_id=?", state.RunID, event).Scan(&count, &firstRevision); err != nil || count != 1 {
			t.Fatalf("%s 没有作为单次里程碑保存: %d %v", event, count, err)
		}
		if firstRevision >= state.Revision {
			t.Fatalf("%s 的首次发生时间被后续重试覆盖", event)
		}
	}
}
