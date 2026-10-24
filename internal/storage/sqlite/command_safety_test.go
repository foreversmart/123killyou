package sqlite

import (
	"reflect"
	"testing"
)

func TestNegatedAndHypotheticalActionsDoNotExecute(t *testing.T) {
	for _, text := range []string{
		"我不去走廊", "不要把铜钥匙给守夜人", "铜钥匙先不给守夜人",
		"如果我把铜钥匙给守夜人会怎么样？", "为什么要去走廊？",
		"不要重新开始", "别关闭声音", "先不看账本",
	} {
		t.Run(text, func(t *testing.T) {
			s := newFixture(t)
			before := createGame(t, s)
			result := run(t, s, before.ID, "uncertain", text)
			if result.Intent != "clarify" || result.Speak == "" {
				t.Fatalf("应当回应并澄清，不执行行动: %s / %s", result.Intent, result.Speak)
			}
			after := result.State
			after.Revision, after.SavedAt = before.Revision, before.SavedAt
			after.LastHeard, after.LastAction = before.LastHeard, before.LastAction
			if !reflect.DeepEqual(before, after) {
				t.Fatal("否定或假设中的行动改变了世界或存档分支")
			}
			var count int
			if err := s.db.QueryRow("SELECT count(*) FROM npc_memories").Scan(&count); err != nil || count != 0 {
				t.Fatal("行动澄清被写入了 NPC 对话记忆")
			}
		})
	}
}

func TestReturningToRoomWithPunctuationDoesNotLoadCheckpoint(t *testing.T) {
	for _, text := range []string{"回到值守室。", "回到值守室！", "回到 值守室"} {
		t.Run(text, func(t *testing.T) {
			s := newFixture(t)
			start := createGame(t, s)
			run(t, s, start.ID, "out", "去走廊")
			result := run(t, s, start.ID, "back", text)
			if result.Intent != "move" || result.State.Room != "watch" || result.State.RunID != start.RunID {
				t.Fatalf("回房间被错误识别为读档: %s / %s", result.Intent, result.Speak)
			}
		})
	}
}

func TestCheckpointNamesAreNotParsedAsActionRefusals(t *testing.T) {
	s := newFixture(t)
	start := createGame(t, s)
	saved := run(t, s, start.ID, "save", "保存为别回头")
	if saved.Intent != "save_checkpoint" {
		t.Fatal("检查点名称被误判为行动否定")
	}
	run(t, s, start.ID, "out", "去走廊")
	loaded := run(t, s, start.ID, "load", "回到别回头")
	if loaded.Intent != "load_checkpoint" || loaded.State.Room != "watch" {
		t.Fatal("不能读取名称里含有否定词的检查点")
	}
}
