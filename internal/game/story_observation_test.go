package game

import (
	"reflect"
	"strings"
	"testing"
)

func TestStoryObservationsShowTheSceneWithoutSpeakingItsDescription(t *testing.T) {
	e := newStoryTestEngine(t)
	for _, tt := range []struct{ scene, command, shot, visible string }{
		{"mini_arrival", "看看山门", "arrival_plaque", "明照寺"},
		{"mini_room", "点燃红烛", "room_candle", "火柴"},
		{"mini_room", "读寺史", "room_history", "验身"},
		{"mini_room", "看经文", "room_scripture", "观身如身"},
		{"mini_room", "检查门闩", "room_latch", "深槽"},
		{"mini_room", "看烛芯", "room_candle_detail", "划痕"},
		{"mini_wake_three_gongs", "看烛芯", "wake_candle_detail", "烛芯发黑"},
		{"mini_wake_three_gongs", "听声音", "wake_door", "刮过门板"},
		{"mini_four_knocks", "看门眼", "four_peephole", "空走廊"},
		{"mini_listen", "检查猫食碟", "listen_cat", "猫叫"},
		{"mini_listen", "检查鸟笼", "listen_bird", "短鸣"},
		{"mini_listen", "碰倒花瓶", "listen_vase", "碎瓷"},
		{"mini_oracle", "检查猫食碟", "oracle_cat", "猫叫"},
		{"mini_oracle", "检查鸟笼", "oracle_bird", "短鸣"},
		{"mini_dawn_trap", "重听锣声", "dawn_gongs", "低长"},
	} {
		t.Run(tt.scene+tt.command, func(t *testing.T) {
			s := e.Initial("observations")
			e.setMiniScene(&s, tt.scene)
			s.Flags["red_candle_held"] = true
			miniDialogue(&s, "陆沉", "上一句对白。")
			_, speak := e.Apply(&s, tt.command)
			if speak != "" || s.Dialogue != (Dialogue{}) {
				t.Fatalf("观察被当成对白朗读: speak=%q dialogue=%+v", speak, s.Dialogue)
			}
			if s.ShotKey != tt.shot || !strings.Contains(s.SceneText, tt.visible) || s.LastAction != s.SceneText {
				t.Fatalf("现场反馈丢失: shot=%s text=%q last=%q", s.ShotKey, s.SceneText, s.LastAction)
			}
		})
	}
}

func TestOpeningGreatScriptureShowsItsFourVerses(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("great-scripture")
	e.setMiniScene(&s, "mini_room")

	intent, speak := e.Apply(&s, "阅读大念处经")
	if intent != "inspect" || speak != "" {
		t.Fatalf("打开经书不应生成对白: intent=%s speak=%q", intent, speak)
	}
	want := "观身如身、观受如受、观心如心、观法如法"
	if s.ShotKey != "room_scripture" || !strings.Contains(s.SceneText, "《大念处经》") || !strings.Contains(s.SceneText, want) {
		t.Fatalf("经书内容未完整呈现: shot=%s text=%q", s.ShotKey, s.SceneText)
	}
	if !s.Flags["mind_script_learned"] || !strings.Contains(strings.Join(s.Clues, "、"), want) {
		t.Fatalf("阅读经书未记录学习内容: flags=%v clues=%v", s.Flags, s.Clues)
	}
}

func TestDoorInvestigationReturnsToTheRequestedSoundOrObject(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("focus")
	e.setMiniScene(&s, "mini_wake_three_gongs")
	storyCommands(e, &s, "听声音", "看烛芯")
	if s.ShotKey != "wake_candle_detail" || s.Flags["candle_relit"] || s.Flags["red_candle_lit"] {
		t.Fatalf("检查烛芯未回到熄烛近景或代替玩家续烛: %+v", s)
	}
	e.setMiniScene(&s, "mini_four_knocks")
	for _, command := range []string{"看门眼", "听敲门", "听声音"} {
		e.Apply(&s, command)
		want := "four_knocks"
		if command == "看门眼" {
			want = "four_peephole"
		}
		if s.ShotKey != want || s.SceneKey != "mini_four_knocks" || s.Flags["four_knocks_survived"] || s.Flags["story_dead"] {
			t.Fatalf("调查改变开门判断或未切回指定焦点: command=%s state=%+v", command, s)
		}
	}
}

func TestFourKnocksQuietWindowAdvancesToThreeKnocks(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("four-knocks-quiet-window")
	e.setMiniScene(&s, "mini_four_knocks")
	if s.DialogueNext != fourKnocksAutoAdvance {
		t.Fatalf("空门场景应安排静默后自动进入三敲: next=%q", s.DialogueNext)
	}

	intent, speak := e.Apply(&s, fourKnocksAutoAdvance)
	if intent != "story" || speak == "" || s.SceneKey != "mini_three_knocks" || !s.Flags["four_knocks_survived"] {
		t.Fatalf("静默窗口结束后未进入三敲: intent=%s speak=%q scene=%s flags=%v", intent, speak, s.SceneKey, s.Flags)
	}
}

func TestFourKnocksListeningResetsQuietWindow(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("four-knocks-listen")
	e.setMiniScene(&s, "mini_four_knocks")
	e.Apply(&s, "听门外")
	if s.SceneKey != "mini_four_knocks" || s.ShotKey != "four_knocks" || s.DialogueNext != fourKnocksAutoAdvance {
		t.Fatalf("重听空门后应重新等待自动转场: %+v", s)
	}
}

func TestFourKnocksSpeechStaysSilentAndLowersDevotion(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("four-knocks-speech")
	e.setMiniScene(&s, "mini_four_knocks")
	s.Devotion = 10

	for _, command := range []string{"问是谁", "我不该说话", "不要打开门"} {
		intent, speak := e.Apply(&s, command)
		if intent != "inspect" || speak != "" || s.Dialogue != (Dialogue{}) {
			t.Fatalf("四敲开口不应生成交谈对象: command=%q intent=%s speak=%q dialogue=%+v", command, intent, speak, s.Dialogue)
		}
		if s.SceneKey != "mini_four_knocks" || s.Flags["four_knocks_survived"] {
			t.Fatalf("四敲开口不应推进场景: command=%q scene=%s flags=%v", command, s.SceneKey, s.Flags)
		}
	}
	if s.Devotion != 4 || s.GhostDialogueTurns != 3 || !s.Flags["ghost_dialogue_started"] {
		t.Fatalf("四敲每句开口都应扣虔诚度: devotion=%d turns=%d flags=%v", s.Devotion, s.GhostDialogueTurns, s.Flags)
	}

	intent, _ := e.Apply(&s, "不开门")
	if intent != "story" || s.SceneKey != "mini_three_knocks" {
		t.Fatalf("明确不开门才应进入三敲: intent=%s scene=%s", intent, s.SceneKey)
	}
}

func TestSilentStoryReplayKeepsTheObservationAndDoesNotRestoreOldSpeech(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("silent-replay")
	if s.Dialogue != (Dialogue{}) || s.SceneText == "" || s.DialogueNext != "继续听" {
		t.Fatal("开场应先呈现山门和环境声音，再等待角色对白")
	}
	e.Apply(&s, "看看山门")
	before := Clone(s)
	intent, speak := e.Apply(&s, "重听当前对白")
	if intent != "replay" || speak != "" || !reflect.DeepEqual(before, s) {
		t.Fatalf("无对白重听补出了旁白或改变剧情: %s %q %+v", intent, speak, s)
	}
}

func TestReadingScriptureIsSpokenByThePlayer(t *testing.T) {
	e, s := storyAtListen(t, true)
	e.Apply(&s, "模仿猫叫")
	_, speak := e.Apply(&s, "朗读大念处经")
	if s.Dialogue.Speaker != "赵熙" || speak != miniScripture[0] {
		t.Fatalf("实际念诵被写成内心独白: %+v", s.Dialogue)
	}
}
