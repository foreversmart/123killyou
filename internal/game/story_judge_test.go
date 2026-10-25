package game

import (
	"context"
	"strings"
	"testing"

	"nightwatch/internal/content"
)

type fakeStoryJudge struct {
	mealCalls   int
	oracleCalls int
	roomCalls   int
	roomRequest RoomActionRequest
	room        RoomActionResult
	roomErr     error
	meal        MealJudgeResult
	oracle      OracleJudgeResult
}

func (f *fakeStoryJudge) JudgeMeal(context.Context, MealJudgeRequest) (MealJudgeResult, error) {
	f.mealCalls++
	return f.meal, nil
}

func (f *fakeStoryJudge) JudgeOracle(context.Context, OracleJudgeRequest) (OracleJudgeResult, error) {
	f.oracleCalls++
	return f.oracle, nil
}

func (f *fakeStoryJudge) JudgeRoomAction(_ context.Context, request RoomActionRequest) (RoomActionResult, error) {
	f.roomCalls++
	f.roomRequest = request
	return f.room, f.roomErr
}

func TestStoryJudgeSettlesCompanionPersuasionAndNaturalReply(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	judge := &fakeStoryJudge{meal: MealJudgeResult{Decisions: map[string]MealDecision{
		"linlan": {Choice: "refused", Reply: "好，我听你的。", Confidence: .92},
	}}}
	e.SetStoryJudge(judge)
	s := e.Initial("judge-meal")
	e.setMiniScene(&s, "mini_refectory")
	_, reply := e.Apply(&s, "劝林岚别吃肉粥")
	if judge.mealCalls != 1 || !s.Flags["meal_linlan_refused"] || strings.Contains(reply, "同行者") || !strings.Contains(reply, "我也不吃肉粥了") {
		t.Fatalf("jev meal decision was not applied: calls=%d flags=%v reply=%s", judge.mealCalls, s.Flags, reply)
	}
}

func TestStoryJudgeUsesSincerityBeforeCupCast(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	judge := &fakeStoryJudge{oracle: OracleJudgeResult{Sincere: true, Score: 88, Confidence: .9}}
	e.SetStoryJudge(judge)
	s := e.Initial("judge-oracle")
	e.setMiniScene(&s, "mini_oracle")
	e.Apply(&s, "确认求回门房")
	if !strings.Contains(s.Dialogue.Text, "红烛的火苗晃动是有风嘛") {
		t.Fatalf("神公没有先问火苗问题: %s", s.Dialogue.Text)
	}
	e.Apply(&s, "可能是风，也可能是我拿得不稳，我会先稳住手")
	if judge.oracleCalls != 1 || !s.Flags["oracle_sincere"] || !s.Flags["oracle_sincerity_judged"] || s.Flags["oracle_sincerity_question"] || s.OracleSincerityScore != 88 {
		t.Fatalf("jev sincerity decision was not applied: calls=%d flags=%v", judge.oracleCalls, s.Flags)
	}
}

func TestStoryJudgeUsesRoomActionOnlyForUnmatchedSpeech(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	judge := &fakeStoryJudge{room: RoomActionResult{Action: RoomActionScripture, Confidence: .91}}
	e.SetStoryJudge(judge)
	s := e.Initial("judge-room")
	e.setMiniScene(&s, "mini_room")
	s.Flags["red_candle_lit"] = true
	intent, speak := e.Apply(&s, "看烛芯")
	if intent != "inspect" || speak != "" || judge.roomCalls != 0 || s.ShotKey != "room_candle_detail" {
		t.Fatalf("明确门房命令不应调用 JEV: intent=%s speak=%q calls=%d shot=%s", intent, speak, judge.roomCalls, s.ShotKey)
	}
	e.Apply(&s, "检查门闩")
	if judge.roomCalls != 0 {
		t.Fatalf("已知门房调查不应调用 JEV: calls=%d", judge.roomCalls)
	}

	intent, speak = e.Apply(&s, "我想看看桌上那本蓝皮书")
	if intent != "inspect" || speak != "" || judge.roomCalls != 1 || s.ShotKey != "room_scripture" || !s.Flags["mind_script_learned"] {
		t.Fatalf("未匹配门房语音没有使用 JEV 选项: intent=%s speak=%q calls=%d shot=%s flags=%v", intent, speak, judge.roomCalls, s.ShotKey, s.Flags)
	}
	if judge.roomRequest.PlayerText != "我想看看桌上那本蓝皮书" || !judge.roomRequest.CandleLit || judge.roomRequest.Scene != s.SceneName {
		t.Fatalf("JEV 门房请求上下文不完整: %+v", judge.roomRequest)
	}
}

func TestStoryJudgeRoomActionLowConfidenceOrFailureDoesNotAdvance(t *testing.T) {
	for _, tt := range []struct {
		name string
		room RoomActionResult
		err  error
	}{
		{name: "low confidence", room: RoomActionResult{Action: RoomActionSleep, Confidence: .4}},
		{name: "request failure", err: context.DeadlineExceeded},
	} {
		t.Run(tt.name, func(t *testing.T) {
			catalog, err := content.Load()
			if err != nil {
				t.Fatal(err)
			}
			e := NewEngine(catalog)
			judge := &fakeStoryJudge{room: tt.room, roomErr: tt.err}
			e.SetStoryJudge(judge)
			s := e.Initial("judge-room-failure")
			e.setMiniScene(&s, "mini_room")
			s.Flags["red_candle_lit"] = true
			before := Clone(s)
			intent, _ := e.Apply(&s, "桌边那本蓝皮书是什么")
			if intent != "clarify" || judge.roomCalls != 1 || s.SceneKey != before.SceneKey || s.ShotKey != before.ShotKey || s.Flags["mind_script_learned"] || s.Flags["slept_before_three_gongs"] {
				t.Fatalf("JEV 失败/低置信推进了门房: intent=%s calls=%d before=%+v after=%+v", intent, judge.roomCalls, before, s)
			}
		})
	}
}

func TestStoryJudgeMapsAllRoomVoiceOptionsThroughJEV(t *testing.T) {
	for _, tt := range []struct {
		name   string
		text   string
		action RoomAction
		shot   string
	}{
		{name: "candle", text: "再看一眼烛火", action: RoomActionCandle, shot: "room_candle_detail"},
		{name: "history", text: "翻翻四史", action: RoomActionHistory, shot: "room_history"},
		{name: "scripture", text: "看看桌上的经书", action: RoomActionScripture, shot: "room_scripture"},
		{name: "sleep", text: "躺下歇一会儿", action: RoomActionSleep, shot: "wake_candle"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			catalog, err := content.Load()
			if err != nil {
				t.Fatal(err)
			}
			e := NewEngine(catalog)
			judge := &fakeStoryJudge{room: RoomActionResult{Action: tt.action, Confidence: .9}}
			e.SetStoryJudge(judge)
			s := e.Initial("judge-room-options")
			e.setMiniScene(&s, "mini_room")
			s.Flags["red_candle_held"] = true
			s.Flags["red_candle_lit"] = true
			intent, speak := e.Apply(&s, tt.text)
			if intent != "inspect" && intent != "sleep" {
				t.Fatalf("JEV 选项没有执行门房动作: intent=%s speak=%q", intent, speak)
			}
			if judge.roomCalls != 1 || s.ShotKey != tt.shot {
				t.Fatalf("JEV 选项状态错误: calls=%d shot=%s state=%+v", judge.roomCalls, s.ShotKey, s)
			}
		})
	}
}

func TestStoryOptionFallbackOnlyResolvesCurrentChoices(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	s := e.Initial("judge-options")
	e.setMiniScene(&s, "mini_four_knocks")
	if command, ok := ResolveStoryOption(s, "listen"); !ok || command != "听敲门" {
		t.Fatalf("option id was not normalized: %q %t", command, ok)
	}
	if _, ok := ResolveStoryOption(s, "打开任意隐藏门"); ok {
		t.Fatal("unknown option was accepted")
	}
	if len(StoryOptionChoices(s)) != 3 {
		t.Fatalf("unexpected current options: %+v", StoryOptionChoices(s))
	}
}
