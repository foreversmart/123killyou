package sqlite

import "testing"

func TestSettingsResetRestartsCurrentStoryAndPreservesCheckpoint(t *testing.T) {
	s := newFixture(t)
	start, err := s.Service.Create()
	if err != nil {
		t.Fatal(err)
	}
	progress := run(t, s, start.ID, "register", "登记入住")
	if progress.State.SceneKey != "mini_register" {
		t.Fatal("未进入远程版本的登记剧情")
	}
	run(t, s, start.ID, "save", "保存为登记后")
	settings := run(t, s, start.ID, "settings", "系统设置")
	if settings.State.Overlay != "settings" || settings.SpeakerID != "" || settings.State.Dialogue.Portrait != "" {
		t.Fatal("系统设置未由旁白打开")
	}
	reset := run(t, s, start.ID, "reset", "重置进度")
	if reset.Intent != "reset" || reset.State.RunID == start.RunID || reset.State.SceneKey != start.SceneKey || !reset.State.StoryMode {
		t.Fatal("重置没有回到当前剧本开场")
	}
	if reset.State.Overlay != "" || reset.State.FocusItem != "" || reset.State.Dialogue.Portrait != "" || reset.SpeakerID != "" {
		t.Fatal("重置没有关闭设置面板并由旁白反馈")
	}
	loaded := run(t, s, start.ID, "load", "回到登记后")
	if loaded.Intent != "load_checkpoint" || loaded.State.SceneKey != progress.State.SceneKey {
		t.Fatal("重置后无法读取原来的命名存档")
	}
}
