package game

import (
	"context"
	"reflect"
	"strings"
	"testing"
)

const sincereMealAppeal = "周砚，别吃肉粥，寺里讲究清净，我们尊重这里的规矩吧。我真心担心这碗粥的来历，馒头和素菜足够填饱肚子，我愿意陪你一起吃。"

type difficultyMealJudge struct {
	decision MealDecision
	err      error
	requests []MealJudgeRequest
}

func (j *difficultyMealJudge) JudgeMeal(_ context.Context, request MealJudgeRequest) (MealJudgeResult, error) {
	j.requests = append(j.requests, request)
	result := MealJudgeResult{Decisions: map[string]MealDecision{}}
	for _, person := range request.Participants {
		result.Decisions[person.ID] = j.decision
	}
	return result, j.err
}

func (*difficultyMealJudge) JudgeOracle(context.Context, OracleJudgeRequest) (OracleJudgeResult, error) {
	return OracleJudgeResult{}, nil
}

func difficultyMealScene(t *testing.T, judge StoryJudge) (*Engine, State) {
	t.Helper()
	e := conversationTestEngine(t)
	e.SetStoryJudge(judge)
	s := e.Initial("meal-difficulty")
	storyCommands(e, &s, "登记入住", "去斋堂", "继续听", "继续听")
	return e, s
}

func TestLinlanAcceptsOneClearAppealWithoutJEV(t *testing.T) {
	judge := &difficultyMealJudge{err: context.DeadlineExceeded}
	e, s := difficultyMealScene(t, judge)
	_, speak := e.Apply(&s, "林岚，别吃肉粥，换馒头吧")
	if !s.Flags["meal_linlan_refused"] || speak == "" || len(judge.requests) != 0 {
		t.Fatalf("林岚没有直接接受首次明确劝说: calls=%d speak=%s flags=%v", len(judge.requests), speak, s.Flags)
	}
}

func TestZhouyanRequiresTwoAttemptsLengthSincerityAndConfidence(t *testing.T) {
	for _, tt := range []struct {
		name     string
		second   string
		decision MealDecision
		accepted bool
	}{
		{name: "sincere and detailed", second: sincereMealAppeal, decision: MealDecision{Choice: "refused", Sincere: true, Confidence: .95}, accepted: true},
		{name: "too short", second: "周砚别吃肉粥", decision: MealDecision{Choice: "refused", Sincere: true, Confidence: .95}},
		{name: "insincere", second: sincereMealAppeal, decision: MealDecision{Choice: "refused", Sincere: false, Confidence: .95}},
		{name: "low confidence", second: sincereMealAppeal, decision: MealDecision{Choice: "refused", Sincere: true, Confidence: .4}},
		{name: "missing confidence", second: sincereMealAppeal, decision: MealDecision{Choice: "refused", Sincere: true}},
		{name: "not persuaded", second: sincereMealAppeal, decision: MealDecision{Choice: "deferred", Sincere: true, Confidence: .95}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", Sincere: true, Confidence: .95}}
			e, s := difficultyMealScene(t, judge)
			e.Apply(&s, sincereMealAppeal)
			if s.Flags["meal_zhouyan_refused"] || s.DialogueNext != "" {
				t.Fatalf("首次长劝说绕过了两次要求或没有等待: next=%s flags=%v", s.DialogueNext, s.Flags)
			}
			judge.decision = tt.decision
			e.Apply(&s, tt.second)
			if s.Flags["meal_zhouyan_refused"] != tt.accepted || s.MealPersuasion["zhouyan"].Attempts != 2 {
				t.Fatalf("周砚门槛判定不符: accepted=%t progress=%+v flags=%v", tt.accepted, s.MealPersuasion["zhouyan"], s.Flags)
			}
			if len(judge.requests) != 2 || judge.requests[0].Participants[0].PersuasionAttempts != 1 || judge.requests[1].Participants[0].PersuasionAttempts != 2 {
				t.Fatalf("JEV没有收到逐次劝说上下文: %+v", judge.requests)
			}
		})
	}
}

func TestXuzhiRequiresThreeDistinctReasonsJudgedByJEV(t *testing.T) {
	text := "许栀，别吃肉粥吧。第一，寺里讲究清净；第二，这碗肉的来历还没有问清；第三，馒头和素菜已经足够让大家吃饱。"
	for _, tt := range []struct {
		name     string
		decision MealDecision
		accepted bool
	}{
		{name: "only two reasons", decision: MealDecision{Choice: "refused", ReasonCount: 2, Confidence: .95}},
		{name: "three distinct reasons", decision: MealDecision{Choice: "refused", ReasonCount: 3, Confidence: .95}, accepted: true},
		{name: "repeated numbered reasons", decision: MealDecision{Choice: "refused", ReasonCount: 1, Confidence: .95}},
		{name: "uncertain count", decision: MealDecision{Choice: "refused", ReasonCount: 3, Confidence: .4}},
		{name: "not persuaded", decision: MealDecision{Choice: "deferred", ReasonCount: 3, Confidence: .95}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			judge := &difficultyMealJudge{decision: tt.decision}
			e, s := difficultyMealScene(t, judge)
			_, speak := e.Apply(&s, text)
			if s.Flags["meal_xuzhi_refused"] != tt.accepted || speak == "" || s.Flags["meal_xuzhi_ate"] {
				t.Fatalf("许栀的理由门槛判定不符: accepted=%t speak=%s flags=%v", tt.accepted, speak, s.Flags)
			}
		})
	}
}

func TestMealPersuasionFailureKeepsChoiceAndExplainsRetry(t *testing.T) {
	for _, unavailable := range []bool{false, true} {
		for _, id := range []string{"zhouyan", "xuzhi"} {
			judge := &difficultyMealJudge{err: context.DeadlineExceeded}
			var provider StoryJudge = judge
			if unavailable {
				provider = nil
			}
			e, s := difficultyMealScene(t, provider)
			miniChooseMeal(&s, id, "ate")
			text := strings.Replace(sincereMealAppeal, "周砚", miniPersonName(id), 1)
			e.Apply(&s, text)
			_, speak := e.Apply(&s, text)
			if !s.Flags["meal_"+id+"_ate"] || s.Flags["meal_"+id+"_refused"] || speak == "" || s.DialogueNext != "" {
				t.Fatalf("JEV不可用时改变了原决定或没有明确反馈: unavailable=%t person=%s speak=%s flags=%v", unavailable, id, speak, s.Flags)
			}
		}
	}
}

func TestXuzhiReasonsDoNotAccumulateAcrossAttempts(t *testing.T) {
	judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", ReasonCount: 1, Confidence: .95}}
	e, s := difficultyMealScene(t, judge)
	for _, text := range []string{"许栀别吃肉粥，寺里应该吃素", "许栀别吃肉粥，肉的来历还没问清", "许栀别吃肉粥，馒头已经够吃"} {
		e.Apply(&s, text)
		if s.Flags["meal_xuzhi_refused"] || s.DialogueNext != "" {
			t.Fatalf("跨轮累计理由让许栀接受或自动转场: progress=%+v flags=%v", s.MealPersuasion["xuzhi"], s.Flags)
		}
	}
}

func TestPersuasionProgressCloneDoesNotMutateOriginal(t *testing.T) {
	e, s := difficultyMealScene(t, nil)
	e.Apply(&s, "周砚，别吃肉粥")
	before := Clone(s)
	candidate := Clone(s)
	e.Apply(&candidate, "周砚，别吃肉粥")
	if !reflect.DeepEqual(s, before) || candidate.MealPersuasion["zhouyan"].Attempts != 2 || s.MealPersuasion["zhouyan"].Attempts != 1 {
		t.Fatalf("计划副本污染了原存档: original=%+v candidate=%+v", s.MealPersuasion, candidate.MealPersuasion)
	}
}

func TestAcceptedCompanionDoesNotRevertWhenLaterJudgeFails(t *testing.T) {
	judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", ReasonCount: 3, Confidence: .95}}
	e, s := difficultyMealScene(t, judge)
	e.Apply(&s, "许栀，别吃肉粥，尊重寺规，肉源不明，馒头也够吃")
	judge.err = context.DeadlineExceeded
	e.Apply(&s, "大家别吃肉粥，换馒头吧")
	if !s.Flags["meal_xuzhi_refused"] || s.Flags["meal_xuzhi_ate"] || s.Flags["meal_xuzhi_deferred"] {
		t.Fatalf("已说服同伴因后续集体判断失败而改口: flags=%v", s.Flags)
	}
}

func TestLongNaturalAppealCanIncludeReasoningWords(t *testing.T) {
	judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", Sincere: true, Confidence: .95}}
	e, s := difficultyMealScene(t, judge)
	e.Apply(&s, "周砚，别吃肉粥")
	text := strings.Replace(sincereMealAppeal, "我真心担心", "我觉得肉源不明值得警惕，真心担心", 1)
	e.Apply(&s, text)
	if !s.Flags["meal_zhouyan_refused"] || len(judge.requests) != 2 {
		t.Fatalf("明确劝说因为解释中的觉得被当成闲聊: calls=%d flags=%v", len(judge.requests), s.Flags)
	}
}

func TestExplicitVegetarianAlternativesCannotBypassDifficulty(t *testing.T) {
	for _, text := range []string{"让周砚吃本地素菜", "劝周砚拒绝吃肉粥", "周砚不喝肉粥", "让许栀吃点咸菜", "劝许栀拒绝吃肉粥"} {
		t.Run(text, func(t *testing.T) {
			judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", Sincere: true, ReasonCount: 2, Confidence: .95}}
			e, s := difficultyMealScene(t, judge)
			_, speak := e.Apply(&s, text)
			id := "zhouyan"
			if strings.Contains(text, "许栀") {
				id = "xuzhi"
			}
			if s.Flags["meal_"+id+"_refused"] || s.MealPersuasion[id].Attempts != 1 || speak == "" || s.DialogueNext != "" {
				t.Fatalf("素食同义表达绕过门槛或未进入劝说: progress=%+v speak=%q next=%s flags=%v", s.MealPersuasion[id], speak, s.DialogueNext, s.Flags)
			}
		})
	}
}

func TestUnclearMealStatementCannotAcceptGenericJudgeRefusal(t *testing.T) {
	for _, id := range []string{"zhouyan", "xuzhi"} {
		judge := &difficultyMealJudge{decision: MealDecision{Choice: "refused", Sincere: true, ReasonCount: 3, Confidence: .95}}
		e, s := difficultyMealScene(t, judge)
		e.Apply(&s, miniPersonName(id)+"，这碗粥看着不太对")
		if s.Flags["meal_"+id+"_refused"] || s.MealPersuasion[id].Attempts != 0 {
			t.Fatalf("没有明确劝素却由通用 JEV 结果越过门槛: person=%s progress=%+v flags=%v", id, s.MealPersuasion[id], s.Flags)
		}
	}
}

func TestWaitingPersuasionDoesNotAutoCloseAndCanBeEndedExplicitly(t *testing.T) {
	for _, group := range []bool{false, true} {
		e, s := difficultyMealScene(t, nil)
		request := "周砚，别吃肉粥"
		if group {
			request = "大家别吃肉粥，换馒头吧"
		}
		e.Apply(&s, request)
		drainMealGroupReplies(t, e, &s)
		for _, command := range []string{"自动结束晚膳", "自动离开斋堂", "自动继续晚膳讨论"} {
			_, speak := e.Apply(&s, command)
			if s.SceneKey != "mini_refectory" || s.DialogueNext != "" || s.Flags["refectory_eating_shown"] || speak == "" {
				t.Fatalf("待补充劝说被自动收束: group=%t command=%s state=%+v", group, command, s)
			}
		}
		e.Apply(&s, "吃完晚膳")
		if s.Flags["meal_persuasion_waiting"] || s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" {
			t.Fatalf("主动结束没进入用膳动画: group=%t state=%+v", group, s)
		}
		storyCommands(e, &s, "自动离开斋堂", "自动离开斋堂")
		if s.SceneKey != "mini_corridor_candle" || !s.Flags["meal_done"] || s.Flags["meal_zhouyan_refused"] || !s.Flags["meal_zhouyan_deferred"] {
			t.Fatalf("退出劝说时改变了未说服的状态或无法转场: group=%t state=%+v", group, s)
		}
	}
}

func TestMentionedPersuasionIsNotANewAppealToCompanions(t *testing.T) {
	for _, text := range []string{"林岚你为什么劝我别吃肉粥", "周砚昨天劝我别吃肉粥", "周砚我不吃肉粥", "周砚我换馒头", "林岚我改吃素菜", "许栀我还是吃素菜"} {
		t.Run(text, func(t *testing.T) {
			e, s := difficultyMealScene(t, nil)
			e.Apply(&s, text)
			for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
				if s.MealPersuasion[id].Attempts != 0 || s.Flags["meal_"+id+"_refused"] {
					t.Fatalf("提及或自己的选择被当成本轮劝说: person=%s progress=%+v flags=%v", id, s.MealPersuasion[id], s.Flags)
				}
			}
			if miniPersonalMealOnly(text) && !s.Flags["meal_player_refused"] {
				t.Fatalf("主角自己的吃素选择没有记录: %s flags=%v", text, s.Flags)
			}
		})
	}
}

func TestNamedCompanionListReceivesSeparateResponses(t *testing.T) {
	e, s := difficultyMealScene(t, nil)
	e.Apply(&s, "林岚、周砚、许栀，别吃肉粥，换馒头吧")
	for index, name := range []string{"林岚", "周砚", "许栀"} {
		if s.Dialogue.Speaker != name || s.Dialogue.Text == "" {
			t.Fatalf("逐个点名劝说缺少自己的回应: want=%s dialogue=%+v", name, s.Dialogue)
		}
		if index < 2 {
			if s.DialogueNext == "" {
				t.Fatalf("点名劝说遗漏后续角色: after=%s flags=%v", name, s.Flags)
			}
			e.Apply(&s, s.DialogueNext)
		}
	}
	if s.DialogueNext != "" || !s.Flags["meal_persuasion_waiting"] {
		t.Fatalf("未说服同伴没有等待补充: state=%+v", s)
	}
}

func TestExplicitGroupMeatChoiceClearsPersuasionWaitAndOldReplies(t *testing.T) {
	e, s := difficultyMealScene(t, nil)
	e.Apply(&s, "大家别吃肉粥，换馒头吧")
	drainMealGroupReplies(t, e, &s)
	e.Apply(&s, "大家都吃肉粥")
	for index, id := range []string{"linlan", "zhouyan", "xuzhi"} {
		if !s.Flags["meal_"+id+"_ate"] || s.Flags["meal_persuasion_waiting"] || s.ShotKey != "refectory_eating" {
			t.Fatalf("明确改口吃肉后仍等待劝说或未结算: person=%s state=%+v", id, s)
		}
		if s.Dialogue.Speaker != miniPersonName(id) || s.Dialogue.Text != miniMealMeatConsentReply(id) {
			t.Fatalf("改口吃肉却复用旧劝素回应: person=%s dialogue=%+v", id, s.Dialogue)
		}
		if index < 2 {
			e.Apply(&s, s.DialogueNext)
		}
	}
	storyCommands(e, &s, "自动离开斋堂", "自动离开斋堂")
	if s.SceneKey != "mini_corridor_candle" || !s.Flags["meal_all_ate"] || !s.Flags["skin_double_present"] {
		t.Fatalf("明确改口吃肉丢失后果或无法离桌: %+v", s)
	}
}
