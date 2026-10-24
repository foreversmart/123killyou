package sqlite

import (
	"database/sql"
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

// fixture is a test fixture bundling the application with its concrete repository.
type fixture struct {
	*session.Service
	db         *sql.DB
	repository *Repository
}

func openFixture(path string) (*fixture, error) {
	repo, err := Open(path)
	if err != nil {
		return nil, err
	}
	catalog, err := content.Load()
	if err != nil {
		repo.Close()
		return nil, err
	}
	return &fixture{session.New(repo, game.NewEngine(catalog)), repo.db, repo}, nil
}
func (s *fixture) Close() error { return s.repository.Close() }

func newFixture(t *testing.T) *fixture {
	t.Helper()
	s, err := openFixture(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func run(t *testing.T, s *fixture, id, requestID, text string) game.Result {
	t.Helper()
	state, err := s.Snapshot(id)
	if err != nil {
		t.Fatal(err)
	}
	r, err := s.Command(id, state.RunID, requestID, text)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestSystemCommandsDoNotChangeDevotion(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	for index, text := range []string{"看看地图", "关掉地图", "打开背包", "看看手记", "暂停游戏", "继续游戏", "关闭声音"} {
		result := run(t, s, state.ID, string(rune('a'+index)), text)
		if result.State.Devotion != state.Devotion {
			t.Fatalf("系统命令 %q 改变了虔诚度", text)
		}
		if text == "关闭声音" && result.State.Overlay != "settings" {
			t.Fatal("关闭声音被误判成了关闭界面")
		}
	}
}

func TestGiveIsAtomicAndIdempotent(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	first := run(t, s, state.ID, "give-1", "把铜钥匙给守夜人")
	again := run(t, s, state.ID, "give-1", "把铜钥匙给守夜人")
	if first.State.Revision != again.State.Revision {
		t.Fatal("相同请求被重复结算")
	}
	if first.State.Devotion != 71 || len(first.State.Inventory) != 4 {
		t.Fatal("交付后的状态不正确")
	}
	for _, item := range first.State.Inventory {
		if item.ID == "key" {
			t.Fatal("钥匙未从道具栏移除")
		}
	}
	second := run(t, s, state.ID, "give-2", "把铜钥匙给守夜人")
	if second.State.Devotion != 71 || len(second.State.Clues) != 1 {
		t.Fatal("重复交付产生了奖励")
	}
}

func TestGiveRequiresNPCInCurrentRoom(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	run(t, s, state.ID, "move", "去走廊")
	r := run(t, s, state.ID, "give", "把铜钥匙给守夜人")
	if r.Intent != "blocked" || r.State.Flags["keyDelivered"] || len(r.State.Inventory) != 4 {
		t.Fatal("隔着房间交付了道具")
	}
}

func TestAmbiguousGiveDoesNotConsumeItems(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	r := run(t, s, state.ID, "unclear", "把这个给守夜人")
	if r.Intent != "clarify" || len(r.State.Inventory) != 4 || r.State.Devotion != 68 {
		t.Fatal("歧义命令改变了状态")
	}
	run(t, s, state.ID, "focus", "看看铜钥匙")
	r = run(t, s, state.ID, "resolved", "把这个给他")
	if r.Intent != "give" {
		t.Fatal("未使用当前物品上下文解析指代")
	}
}

func TestPausePreventsStoryProgress(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	run(t, s, state.ID, "pause", "暂停游戏")
	r := run(t, s, state.ID, "move", "去走廊")
	if r.State.Room != "watch" {
		t.Fatal("暂停时仍然移动")
	}
	run(t, s, state.ID, "resume", "继续游戏")
	r = run(t, s, state.ID, "move-2", "去走廊")
	if r.State.Room != "corridor" {
		t.Fatal("恢复后无法移动")
	}
}

func TestRoomProgressAndJournalPersist(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	run(t, s, state.ID, "ledger", "看看账本")
	run(t, s, state.ID, "out", "去走廊")
	run(t, s, state.ID, "back", "回值守室")
	r := run(t, s, state.ID, "ledger-again", "看看账本")
	if len(r.State.Clues) != 1 || !r.State.Flags["visitedCorridor"] {
		t.Fatal("跨房间状态丢失或重复记录线索")
	}
}

func TestExposureAndRestart(t *testing.T) {
	s := newFixture(t)
	state, err := s.Create()
	if err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{"a", "b", "c"} {
		run(t, s, state.ID, id, "你们都是骗子")
	}
	current, _ := s.Snapshot(state.ID)
	if !current.Caught {
		t.Fatal("未触发身份暴露")
	}
	r := run(t, s, state.ID, "out", "去走廊")
	if r.State.Room != "watch" {
		t.Fatal("被捕后仍能正常移动")
	}
	r = run(t, s, state.ID, "reset", "重新开始")
	if r.State.Caught || r.State.Devotion != 68 || r.State.ID != state.ID {
		t.Fatal("重开没有正确恢复状态")
	}
}
