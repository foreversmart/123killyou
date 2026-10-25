package sqlite

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"reflect"
	"sync"
	"testing"

	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

func createGame(t *testing.T, s *fixture) game.State {
	t.Helper()
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	return state
}

func reopen(t *testing.T, path string) *fixture {
	t.Helper()
	s, err := openFixture(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestSaveSurvivesRestartAndDeduplicatesOldRequest(t *testing.T) {
	path := filepath.Join(t.TempDir(), "本机 存档", "night watch.db")
	s := reopen(t, path)
	state := createGame(t, s)
	given := run(t, s, state.ID, "give", "把铜钥匙给守夜人")
	run(t, s, state.ID, "ledger", "看看账本")
	run(t, s, state.ID, "talk", "我不相信你们")
	want := run(t, s, state.ID, "move", "去走廊").State
	if err := s.Close(); err != nil {
		t.Fatal(err)
	}
	s = reopen(t, path)
	got, err := s.Resume()
	if err != nil {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("重启后进度不一致: %#v / %#v", got, want)
	}
	again, err := s.Command(state.ID, state.RunID, "give", "把铜钥匙给守夜人")
	if err != nil {
		t.Fatal(err)
	}
	// Audio availability is transient; durable state and command output must match.
	again.HasAudio, given.HasAudio = false, false
	again.VoiceError, given.VoiceError = "", ""
	if !reflect.DeepEqual(again, given) {
		t.Fatal("重启后没有返回原请求结果")
	}
	after, _ := s.Snapshot(state.ID)
	if !reflect.DeepEqual(after, want) {
		t.Fatal("重试旧请求回滚或重复修改了当前状态")
	}
	if _, err := s.Command(state.ID, state.RunID, "give", "去走廊"); !errors.Is(err, session.ErrRequest) {
		t.Fatal("复用请求编号却改变输入未被拒绝")
	}
}

func TestCheckpointRestoresWorldMemoryAndFencesOldRun(t *testing.T) {
	s := newFixture(t)
	start := createGame(t, s)
	run(t, s, start.ID, "talk", "你是谁")
	want := run(t, s, start.ID, "ledger", "看看账本").State
	run(t, s, start.ID, "save", "保存为交付前")
	run(t, s, start.ID, "close", "返回")
	run(t, s, start.ID, "give", "把铜钥匙给守夜人")
	run(t, s, start.ID, "later-talk", "你们都是骗子")
	later := run(t, s, start.ID, "move", "去走廊").State
	loaded := run(t, s, start.ID, "load", "回到交付前")
	got := loaded.State
	if loaded.Intent != "load_checkpoint" || got.RunID == start.RunID || got.Revision <= later.Revision {
		t.Fatal("读取检查点没有建立新分支和递增版本")
	}
	if got.Room != want.Room || got.Devotion != want.Devotion || !reflect.DeepEqual(got.Inventory, want.Inventory) || !reflect.DeepEqual(got.Flags, want.Flags) || !reflect.DeepEqual(got.Clues, want.Clues) {
		t.Fatal("回档没有同步恢复世界")
	}
	if got.Dialogue != (game.Dialogue{Speaker: "系统", Text: loaded.Speak}) {
		t.Fatal("回档确认未使用无头像系统反馈")
	}
	var memories, events, archived int
	s.db.QueryRow("SELECT count(*) FROM npc_memories WHERE run_id=?", got.RunID).Scan(&memories)
	s.db.QueryRow("SELECT count(*) FROM events WHERE run_id=?", got.RunID).Scan(&events)
	s.db.QueryRow("SELECT archived FROM runs WHERE id=?", start.RunID).Scan(&archived)
	if memories != 1 || events != 1 || archived != 1 {
		t.Fatalf("记忆或事件串入未来: memories=%d events=%d archived=%d", memories, events, archived)
	}
	if _, err := s.Command(start.ID, start.RunID, "late-command", "去走廊"); !errors.Is(err, session.ErrStaleRun) {
		t.Fatal("旧分支迟到请求未被拒绝")
	}
	// Retrying the load after losing its response returns the same fork, not another one.
	duplicate, err := s.Command(start.ID, start.RunID, "load", "回到交付前")
	if err != nil || !reflect.DeepEqual(duplicate, loaded) {
		t.Fatal("读取检查点的重试又产生了分支")
	}
	reward := run(t, s, start.ID, "give", "把铜钥匙给守夜人")
	if reward.State.Devotion != 71 || !reward.State.Flags["keyDelivered"] {
		t.Fatal("新分支不能正常再次完成交付")
	}
}

func TestRewardCheckpointSurvivesResetAndRestart(t *testing.T) {
	path := filepath.Join(t.TempDir(), "save.db")
	s := reopen(t, path)
	start := createGame(t, s)
	run(t, s, start.ID, "give", "把铜钥匙给守夜人")
	run(t, s, start.ID, "save", "保存为交付后")
	reset := run(t, s, start.ID, "reset", "重新开始")
	if reset.State.RunID == start.RunID || reset.State.Flags["keyDelivered"] {
		t.Fatal("重开没有建立干净的新一局")
	}
	var count int
	s.db.QueryRow("SELECT count(*) FROM npc_memories WHERE run_id=?", reset.State.RunID).Scan(&count)
	if count != 0 {
		t.Fatal("重开携带了上局角色记忆")
	}
	s.Close()
	s = reopen(t, path)
	loaded := run(t, s, start.ID, "load", "回到交付后")
	if loaded.State.Devotion != 71 || !loaded.State.Flags["keyDelivered"] {
		t.Fatal("重启后不能恢复重开前的检查点")
	}
	again := run(t, s, start.ID, "another-give", "把铜钥匙给守夜人")
	if again.Intent != "blocked" || again.State.Devotion != 71 {
		t.Fatal("已领奖励在回档后被重复领取")
	}
}

func TestFailedCommitLeavesNoPartialReward(t *testing.T) {
	s := newFixture(t)
	before := createGame(t, s)
	_, err := s.db.Exec(`CREATE TRIGGER fail_command BEFORE INSERT ON commands BEGIN SELECT RAISE(ABORT,'simulated disk failure'); END;`)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Command(before.ID, before.RunID, "give", "把铜钥匙给守夜人"); err == nil {
		t.Fatal("预期写盘失败")
	}
	after, err := s.Snapshot(before.ID)
	if err != nil || !reflect.DeepEqual(before, after) {
		t.Fatal("失败写入仍然修改了背包或状态")
	}
	for _, table := range []string{"events", "npc_memories", "commands"} {
		var count int
		if err := s.db.QueryRow("SELECT count(*) FROM " + table).Scan(&count); err != nil || count != 0 {
			t.Fatalf("%s 残留了未提交效果", table)
		}
	}
	s.db.Exec("DROP TRIGGER fail_command")
	r := run(t, s, before.ID, "give", "把铜钥匙给守夜人")
	if r.State.Devotion != 71 {
		t.Fatal("失败后不能重试同一请求")
	}
}

func TestConcurrentDeliveryOnlyCommitsOnce(t *testing.T) {
	s := newFixture(t)
	state := createGame(t, s)
	var group sync.WaitGroup
	for range 12 {
		group.Go(func() {
			r, err := s.Command(state.ID, state.RunID, "same-request", "把铜钥匙给守夜人")
			if err != nil || r.State.Revision != 2 || r.State.Devotion != 71 {
				t.Errorf("并发重试结果错误: %v %#v", err, r)
			}
		})
	}
	group.Wait()
	after, _ := s.Snapshot(state.ID)
	if after.Revision != 2 {
		t.Fatal("并发重试被重复结算")
	}
}

func TestInvalidCheckpointAndSystemCommandsDoNotBecomeNPCMemory(t *testing.T) {
	s := newFixture(t)
	state := createGame(t, s)
	run(t, s, state.ID, "save", "保存为初见")
	run(t, s, state.ID, "move", "去走廊")
	duplicate := run(t, s, state.ID, "duplicate-name", "保存为初见")
	if duplicate.Intent != "clarify" {
		t.Fatal("同名检查点被静默覆盖")
	}
	missing := run(t, s, state.ID, "missing", "回到不存在的检查点")
	if missing.Intent != "clarify" || missing.State.Room != "corridor" {
		t.Fatal("不存在的检查点改变了场景")
	}
	back := run(t, s, state.ID, "back", "回到休息室")
	if back.Intent != "move" {
		t.Fatal("回房间被误判成读取存档")
	}
	run(t, s, state.ID, "load", "回到初见")
	run(t, s, state.ID, "map", "看看地图")
	latest := run(t, s, state.ID, "list", "看看存档")
	var count int
	s.db.QueryRow("SELECT count(*) FROM npc_memories WHERE run_id=?", latest.State.RunID).Scan(&count)
	if count != 0 {
		t.Fatal("系统存档或地图操作泄露给 NPC")
	}
	if latest.State.Devotion != 68 {
		t.Fatal("系统操作影响了虔诚度")
	}
}

func TestVersionMismatchPreservesSaveAndTransientEffectIsNotRestored(t *testing.T) {
	s := newFixture(t)
	state := createGame(t, s)
	run(t, s, state.ID, "effect", "出现故障")
	restored, _ := s.Snapshot(state.ID)
	if restored.Effect.Kind != "none" {
		t.Fatal("恢复时重放了瞬时特效")
	}
	raw, _ := json.Marshal(session.Snapshot{Version: session.StateVersion, StoryVersion: "incompatible-story", State: restored})
	s.db.Exec("UPDATE runs SET state_json=? WHERE id=?", raw, restored.RunID)
	if _, err := s.Resume(); !errors.Is(err, session.ErrSaveFormat) {
		t.Fatal("不兼容的剧情存档未被拒绝")
	}
	var count int
	s.db.QueryRow("SELECT count(*) FROM runs").Scan(&count)
	if count != 1 {
		t.Fatal("不兼容存档被静默替换")
	}
}
