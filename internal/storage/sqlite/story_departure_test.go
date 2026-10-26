package sqlite

import (
	"fmt"
	"reflect"
	"testing"

	"nightwatch/internal/game"
)

func TestDawnPermitReturnSurvivesAutosaveAndCheckpointRestore(t *testing.T) {
	s := newFixture(t)
	state, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	for index := 0; state.SceneKey != "mini_dawn"; index++ {
		if index >= 14 {
			t.Fatal("调试跳转未能到达天亮场景")
		}
		state = run(t, s, state.ID, fmt.Sprintf("departure-skip-%d", index), "调试跳到下一剧情场景").State
	}
	var expectedItems []game.Item
	for _, item := range state.Inventory {
		if item.ID != "permit" {
			expectedItems = append(expectedItems, item)
		}
	}
	for index := range 3 {
		state = run(t, s, state.ID, fmt.Sprintf("dawn-dialogue-%d", index), "继续听").State
	}
	if state.ShotKey != "dawn_gate" || state.DialogueNext != "" || !state.Flags["permit_returned"] || !reflect.DeepEqual(state.Inventory, expectedItems) {
		t.Fatal("自动山门收件未只移除通行凭")
	}
	resumed, err := s.Service.Resume()
	if err != nil || !reflect.DeepEqual(resumed, state) {
		t.Fatalf("自动存档没有保留归还后的物品状态: %+v %v", resumed, err)
	}
	run(t, s, state.ID, "save-departure", "保存为归还通行凭后")
	run(t, s, state.ID, "board-bus", "坐大巴回家")
	restored := run(t, s, state.ID, "restore-departure", "回到归还通行凭后").State
	if !restored.Flags["permit_returned"] || !reflect.DeepEqual(restored.Inventory, expectedItems) || restored.ShotKey != "dawn_gate" {
		t.Fatal("读取检查点恢复了已交还的通行凭或改变了其他物品")
	}
}
