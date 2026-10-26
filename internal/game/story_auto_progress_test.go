package game

import (
	"strings"
	"testing"
)

func advanceScriptedLines(t *testing.T, e *Engine, state *State) {
	t.Helper()
	for count := 0; state.DialogueNext != "" && !strings.HasPrefix(state.DialogueNext, "自动"); count++ {
		if count > 20 {
			t.Fatal("安全对白没有在自动串联前结束")
		}
		e.Apply(state, state.DialogueNext)
	}
}

func TestSafeStorySegmentsExposeTimedNpcHandoffs(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("auto-handoff")
	advanceScriptedLines(t, e, &s)
	if s.DialogueNext != "自动登记入住" {
		t.Fatalf("山门对白结束后没有登记自动命令: %q", s.DialogueNext)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_register" || s.Dialogue.Speaker != "陆沉" {
		t.Fatalf("自动登记没有由陆沉接管: scene=%s dialogue=%+v", s.SceneKey, s.Dialogue)
	}

	advanceScriptedLines(t, e, &s)
	if s.DialogueNext != "自动放好行李" || s.ShotKey != "register_key_tags" {
		t.Fatalf("登记对白后没有完成钥匙房牌交接: shot=%s next=%q", s.ShotKey, s.DialogueNext)
	}
	e.Apply(&s, s.DialogueNext)
	if s.DialogueNext != "自动去斋堂" || s.ShotKey != "register_luggage" || !s.Flags["luggage_placed"] {
		t.Fatalf("放行李没有接到斋堂: next=%q flags=%v", s.DialogueNext, s.Flags)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_refectory" {
		t.Fatalf("自动去斋堂未切换场景: %s", s.SceneKey)
	}
}

func TestSilentRefectoryHandoffDefaultsToVegetarianMeal(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("auto-meal")
	e.Apply(&s, "登记入住")
	e.Apply(&s, "去斋堂")
	advanceScriptedLines(t, e, &s)
	advanceMealDiscussion(t, e, &s)
	if s.DialogueNext != "自动结束晚膳" || s.Dialogue.Speaker == "慧普" {
		t.Fatalf("斋堂无响应仍播出了帘后支线或没有自动收束: speaker=%s next=%q", s.Dialogue.Speaker, s.DialogueNext)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_refectory" || s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" {
		t.Fatalf("无响应晚膳没有先播放用膳镜头: scene=%s shot=%s next=%q flags=%v", s.SceneKey, s.ShotKey, s.DialogueNext, s.Flags)
	}
	if s.Dialogue.Speaker != "许栀" || !strings.Contains(s.Dialogue.Text, "不") || !strings.Contains(s.Dialogue.Text, "素菜") {
		t.Fatalf("无响应时没有由NPC说明不吃肉粥: %+v", s.Dialogue)
	}
	for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
		if !s.Flags["meal_"+person+"_refused"] || s.Flags["meal_"+person+"_ate"] {
			t.Fatalf("无响应晚膳没有默认不吃肉粥: person=%s flags=%v", person, s.Flags)
		}
	}
	if s.Flags["skin_double_present"] {
		t.Fatal("无响应晚膳不应开启吃粥换皮支线")
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_refectory" || s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" || !strings.Contains(s.Dialogue.Text, "吃完") {
		t.Fatalf("吃饭动画结束后没有先由同行者确认收碗: scene=%s shot=%s next=%q dialogue=%+v", s.SceneKey, s.ShotKey, s.DialogueNext, s.Dialogue)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_corridor_candle" || !s.Flags["meal_done"] {
		t.Fatalf("同行者确认后没有由陆沉带回回廊: scene=%s flags=%v", s.SceneKey, s.Flags)
	}

	// The corridor is the last safe handoff. Its scripted warning still plays,
	// but it must stop and wait for the player to claim the candle and return
	// to the room; no timer command may silently perform that survival action.
	advanceScriptedLines(t, e, &s)
	if s.SceneKey != "mini_corridor_candle" || s.DialogueNext != "" || s.Flags["red_candle_held"] {
		t.Fatalf("回廊对白结束后不应自动领烛或回房: scene=%s next=%q flags=%v", s.SceneKey, s.DialogueNext, s.Flags)
	}
}

func TestAutomaticMealClosurePreservesExplicitPorridgeChoice(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("auto-meal-choice")
	e.Apply(&s, "登记入住")
	e.Apply(&s, "去斋堂")
	e.Apply(&s, "我吃粥")
	if !s.Flags["meal_player_ate"] {
		t.Fatalf("明确吃粥没有记录: %v", s.Flags)
	}
	e.Apply(&s, "继续听")
	advanceScriptedLines(t, e, &s)
	advanceMealDiscussion(t, e, &s)
	if s.DialogueNext != "自动结束晚膳" {
		t.Fatalf("斋堂安全对白没有进入自动收束: %q", s.DialogueNext)
	}
	e.Apply(&s, s.DialogueNext)
	if !s.Flags["meal_player_ate"] || !s.Flags["skin_double_present"] || s.Flags["meal_player_deferred"] {
		t.Fatalf("自动收束覆盖了明确吃粥选择: %v", s.Flags)
	}
	if s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" {
		t.Fatalf("明确吃粥没有先进入统一吃饭动画: shot=%s next=%q", s.ShotKey, s.DialogueNext)
	}
	if s.Dialogue.Speaker == "" || strings.TrimSpace(s.Dialogue.Text) == "" {
		t.Fatalf("吃饭动画缺少 NPC 反馈: %+v", s.Dialogue)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_refectory" || !strings.Contains(s.Dialogue.Text, "吃完") {
		t.Fatalf("统一吃饭动画后没有由同行者确认收碗: scene=%s dialogue=%+v", s.SceneKey, s.Dialogue)
	}
	e.Apply(&s, s.DialogueNext)
	if s.SceneKey != "mini_corridor_candle" || !s.Flags["meal_done"] {
		t.Fatalf("同行者确认后没有由守夜人带回偏房: scene=%s flags=%v", s.SceneKey, s.Flags)
	}
}

func TestVegetarianMealChoiceStartsEatingBeatBeforeLeaving(t *testing.T) {
	for _, choice := range []string{"我不吃肉粥", "我吃馒头", "我吃素"} {
		t.Run(choice, func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("vegetarian-meal-choice")
			e.Apply(&s, "登记入住")
			e.Apply(&s, "去斋堂")

			e.Apply(&s, choice)
			if !s.Flags["meal_player_refused"] || s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" {
				t.Fatalf("素食选择没有进入吃饭动画: shot=%s next=%q flags=%v", s.ShotKey, s.DialogueNext, s.Flags)
			}
			e.Apply(&s, s.DialogueNext)
			if s.SceneKey != "mini_refectory" || !strings.Contains(s.Dialogue.Text, "吃完") {
				t.Fatalf("吃饭动画结束后没有由同行者确认收碗: scene=%s dialogue=%+v", s.SceneKey, s.Dialogue)
			}
			e.Apply(&s, s.DialogueNext)
			if s.SceneKey != "mini_corridor_candle" || !s.Flags["meal_done"] {
				t.Fatalf("同行者确认后没有由陆沉带回东院: scene=%s flags=%v", s.SceneKey, s.Flags)
			}
		})
	}
}

func TestPlayerInvestigationCancelsPendingSafeHandoff(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("auto-cancel")
	advanceScriptedLines(t, e, &s)
	if s.DialogueNext != "自动登记入住" {
		t.Fatalf("前置自动命令缺失: %q", s.DialogueNext)
	}
	e.Apply(&s, "看看山门")
	if s.DialogueNext != "" || s.SceneKey != "mini_arrival" {
		t.Fatalf("调查没有取消待执行转场: scene=%s next=%q", s.SceneKey, s.DialogueNext)
	}
}
