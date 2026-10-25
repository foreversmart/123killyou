package game

import (
	"reflect"
	"testing"
)

const debugNextScene = "调试跳到下一剧情场景"

func TestDebugSkipVisitsEverySceneAndStopsAtEnding(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("debug-order")
	s.Clues = append(s.Clues, "已调查的旧名")
	s.Flags["history_read"] = true
	for index, target := range miniDebugSceneOrder[1:] {
		intent, _ := e.Apply(&s, debugNextScene)
		if intent != "debug_skip" || s.SceneKey != target || s.ShotKey != miniOpeningShots[target] {
			t.Fatalf("第%d次跳转没有停在目标首镜头: %s %+v", index+1, intent, s)
		}
		if s.DialogueNext != "" || s.Dialogue.Speaker == "系统" || len(s.Actors) == 0 || s.SceneText == "" {
			t.Fatalf("%s 没有准备演出: %+v", target, s)
		}
		if !s.Flags["debug_scene_skipped"] || !s.Flags["history_read"] || !reflect.DeepEqual(s.Clues, []string{"已调查的旧名"}) {
			t.Fatal("跳转没有标记调试或丢失已有调查")
		}
		if s.ID != "debug-order" || s.Devotion != e.content.World().InitialDevotion {
			t.Fatal("跳转重置了全局身份或虔诚度")
		}
		if index+1 >= 4 && !s.Flags["red_candle_held"] {
			t.Fatal("进入房间后缺少红烛")
		}
		if index+1 >= 5 && s.Flags["red_candle_lit"] != (target != "mini_wake_three_gongs") {
			t.Fatalf("%s 的烛火状态错误", target)
		}
		probe := Clone(s)
		switch target {
		case "mini_register":
			e.Apply(&probe, "去斋堂")
			if probe.SceneKey != "mini_refectory" {
				t.Fatal("登记目标不可继续")
			}
		case "mini_refectory":
			if s.Flags["meal_player_refused"] {
				t.Fatal("尚未晚膳就替玩家做了选择")
			}
		case "mini_room":
			e.Apply(&probe, "睡下")
			if probe.SceneKey != "mini_wake_three_gongs" {
				t.Fatal("门房缺少安全入睡条件")
			}
		case "mini_wake_three_gongs":
			e.Apply(&probe, "续燃红烛")
			if probe.SceneKey != "mini_four_knocks" {
				t.Fatal("三更缺少续烛条件")
			}
		case "mini_listen":
			e.Apply(&probe, "模仿猫叫")
			if probe.Flags["story_dead"] || probe.SceneKey != "mini_dawn_trap" {
				t.Fatal("偷听场景缺少已听过的动物声音或改变默认拒粥路线")
			}
		case "mini_oracle":
			e.Apply(&probe, "确认求回门房")
			e.Apply(&probe, "掷杯筊")
			if probe.ShotKey != "oracle_cast" {
				t.Fatal("可选神公场景不可投掷")
			}
		case "mini_double":
			e.Apply(&probe, "朗读清心静神经")
			if probe.ShotKey != "double_scripture_1" || !s.Flags["skin_double_present"] {
				t.Fatal("强制假人场景缺少经文准备")
			}
		}
	}
	if !s.Flags["story_finished"] {
		t.Fatal("结局没有完成标记")
	}
	before := Clone(s)
	intent, speak := e.Apply(&s, debugNextScene)
	before.Dialogue, before.LastAction = s.Dialogue, s.LastAction
	if intent != "debug_skip" || speak == "" || !reflect.DeepEqual(before, s) {
		t.Fatal("结局调试跳转循环或修改了已完成进度")
	}
}

func TestDebugSkipRecoversDeathPauseAndPanelsWithoutResettingChoices(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("debug-recovery")
	for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
		miniChooseMeal(&s, person, "ate")
	}
	s.Flags["bowl_tags_seen"] = true
	e.setMiniScene(&s, "mini_wake_three_gongs")
	e.storyDeath(&s, "烛火未续燃")
	s.Paused, s.Caught, s.Overlay, s.FocusItem = true, true, "map", "page"
	intent, _ := e.Apply(&s, debugNextScene)
	if intent != "debug_skip" || s.SceneKey != "mini_four_knocks" || s.Paused || s.Caught || s.Flags["story_dead"] || s.RetryScene != "" || s.Overlay != "" || s.FocusItem != "" || s.Effect.Kind != "none" {
		t.Fatalf("没有跳过死亡来源并恢复可交互状态: %+v", s)
	}
	if !s.Flags["meal_player_ate"] || s.Flags["meal_player_refused"] || !s.Flags["meal_all_ate"] || !s.Flags["bowl_tags_seen"] {
		t.Fatal("调试替换了玩家吃粥选择或调查")
	}
	e.Apply(&s, debugNextScene)
	e.Apply(&s, debugNextScene)
	if s.Flags["companion_present"] {
		t.Fatal("所有同伴吃粥后凭空补了真同伴")
	}
	s.Flags["cup_cast_counted"], s.Flags["cup_failed"], s.Flags["oracle_question"] = true, true, true
	e.Apply(&s, debugNextScene)
	if s.SceneKey != "mini_oracle" || s.Flags["cup_cast_counted"] || s.Flags["oracle_question"] || s.Flags["cup_failed"] {
		t.Fatal("神公目标保留了旧投掷结算")
	}
	s.Flags["double_calm"], s.Flags["double_frenzy"], s.Flags["double_scripture_1"] = true, true, true
	e.Apply(&s, debugNextScene)
	if s.SceneKey != "mini_double" || s.Flags["double_calm"] || s.Flags["double_frenzy"] || s.Flags["double_scripture_1"] {
		t.Fatal("假人目标没有恢复首镜头交互")
	}
}

func TestDebugSkipRequiresExactNormalizedCommand(t *testing.T) {
	e := newStoryTestEngine(t)
	for _, command := range []string{"不要调试跳到下一剧情场景", "如果调试跳到下一剧情场景会怎样", "调试跳到下一剧情场景一下", "下一剧情场景"} {
		s := e.Initial("debug-exact")
		intent, _ := e.Apply(&s, command)
		if intent == "debug_skip" || s.SceneKey != "mini_arrival" || s.Flags["debug_scene_skipped"] {
			t.Fatalf("非精确命令误触发: %q", command)
		}
	}
	s := e.Initial("normal")
	e.Apply(&s, "继续听")
	if s.SceneKey != "mini_arrival" || s.ShotKey != "arrival_unload" || s.Flags["debug_scene_skipped"] {
		t.Fatal("正常剧情被调试功能影响")
	}
	e.Apply(&s, " 调试 跳到 下一剧情场景。 ")
	if s.SceneKey != "mini_register" {
		t.Fatal("精确Normalize命令没有触发")
	}
}

func TestDebugSkipKeepsIndividualMealsAndDefaultsOnlyUnchosenPeople(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("debug-meals")
	e.setMiniScene(&s, "mini_refectory")
	miniChooseMeal(&s, "linlan", "ate")
	miniChooseMeal(&s, "zhouyan", "deferred")
	e.Apply(&s, debugNextScene)
	if !s.Flags["meal_linlan_ate"] || !s.Flags["meal_zhouyan_deferred"] || !s.Flags["meal_xuzhi_refused"] || !s.Flags["meal_player_refused"] {
		t.Fatalf("部分已选饭局被重置: %+v", s.Flags)
	}
	for s.SceneKey != "mini_listen" {
		e.Apply(&s, debugNextScene)
	}
	if miniCompanionID(&s) != "zhouyan" || !s.Flags["companion_present"] {
		t.Fatal("暂缓吃粥的周砚没有继续作为真同伴")
	}
}
