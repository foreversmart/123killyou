package sqlite

import (
	"reflect"
	"strings"
	"testing"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

func assertStoryOpening(t *testing.T, state game.State) {
	t.Helper()
	if !state.StoryMode || state.SceneKey != "mini_arrival" || state.Room != "gate" || state.RoomName != "红烛寺山门" {
		t.Fatalf("新局没有完整进入第一幕: %+v", state)
	}
	if len(state.Actors) != 5 || state.Actors[0].Position != "大巴车门旁 / 第一视角" || state.Actors[4].Name != "陆沉" {
		t.Fatalf("第一幕人物站位缺失: %+v", state.Actors)
	}
	if len(state.SceneProps) != 12 || !strings.Contains(state.SceneText, "大巴停在红烛寺山门前") {
		t.Fatalf("第一幕分镜与道具缺失: %+v", state)
	}
	if len(state.Inventory) != 0 || state.Flags["checked_in"] || state.Flags["red_candle_held"] {
		t.Fatalf("新局提前获得了登记或回廊物品: %+v", state)
	}
}

func TestProductionNewGameEntryPointsStartAtFirstScene(t *testing.T) {
	for _, entry := range []string{"Create", "ResumeEmpty"} {
		t.Run(entry, func(t *testing.T) {
			s := newFixture(t)
			var state game.State
			var err error
			if entry == "Create" {
				state, err = s.Service.Create()
			} else {
				state, err = s.Service.Resume()
			}
			if err != nil {
				t.Fatal(err)
			}
			assertStoryOpening(t, state)
			if state.Dialogue != (game.Dialogue{}) {
				t.Fatalf("开场环境被写成了对白: %+v", state.Dialogue)
			}
			resumed, err := s.Service.Resume()
			if err != nil || !reflect.DeepEqual(resumed, state) {
				t.Fatalf("新局没有原样存入自动存档: %+v %v", resumed, err)
			}
		})
	}
}

func TestOpeningPreviewNeverChangesAutoSave(t *testing.T) {
	s := newFixture(t)
	preview := s.Opening()
	assertStoryOpening(t, preview)
	if preview.ID != "" || preview.RunID != "" || preview.SavedAt != "" {
		t.Fatal("预览被误标为已创建的会话")
	}
	if err := s.repository.Transaction(func(tx session.Transaction) error {
		_, err := tx.AutoSave()
		if err != session.ErrSession {
			t.Fatalf("空库预览创建了自动存档: %v", err)
		}
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	state, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	progress := run(t, s, state.ID, "register", "登记入住").State
	assertStoryOpening(t, s.Opening())
	resumed, err := s.Service.Resume()
	if err != nil || !reflect.DeepEqual(resumed, progress) {
		t.Fatalf("查看第一幕覆盖了已有自动存档: %+v %v", resumed, err)
	}
}

func TestStoryItemsArriveAtTheirScenesAndResetClearsThem(t *testing.T) {
	s := newFixture(t)
	state, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	registered := run(t, s, state.ID, "register", "登记入住").State
	if registered.SceneKey != "mini_register" || len(registered.Inventory) != 0 {
		t.Fatalf("山门转入登记室时不应提前发放房间用品: %+v", registered)
	}
	registered = run(t, s, state.ID, "register-dialogue", "听入住对白").State
	if len(registered.Inventory) != 4 || !registered.Flags["registration_items_given"] {
		t.Fatalf("登记室登记后未发放房间用品: %+v", registered)
	}
	for _, item := range registered.Inventory {
		if item.ID == "candle" {
			t.Fatal("登记时提前发放了回廊红烛")
		}
	}
	for index, command := range []string{"去斋堂", "我不吃", "吃完晚膳", "拿红烛", "拿红烛"} {
		state = run(t, s, state.ID, string(rune('a'+index)), command).State
	}
	if len(state.Inventory) != 5 || !state.Flags["red_candle_held"] {
		t.Fatalf("回廊红烛没有正确发放或发生重复: %+v", state)
	}
	reset := run(t, s, state.ID, "reset", "重新开始").State
	assertStoryOpening(t, reset)
	if reset.ID != state.ID || reset.RunID == state.RunID || reset.Revision <= state.Revision {
		t.Fatal("重新开始没有建立新分支")
	}
	resumed, err := s.Service.Resume()
	if err != nil || !reflect.DeepEqual(resumed, reset) {
		t.Fatalf("重新开始没有保存真实第一幕: %+v %v", resumed, err)
	}
}
