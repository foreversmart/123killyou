package game

import (
	"nightwatch/internal/content"
	"reflect"
	"strings"
	"testing"
)

func advanceMealDiscussion(t *testing.T, e *Engine, state *State) {
	t.Helper()
	for count := 0; state.DialogueNext == mealDiscussionAdvance; count++ {
		if count > 2 {
			t.Fatal("晚膳讨论没有结束")
		}
		e.Apply(state, state.DialogueNext)
	}
}

func mealAtPersuasionWindow(t *testing.T) (*Engine, State) {
	t.Helper()
	e := newStoryTestEngine(t)
	s := e.Initial("meal-persuasion-window")
	storyCommands(e, &s, "登记入住", "去斋堂", "继续听", "继续听")
	if s.Dialogue.Speaker != "陆沉" || s.DialogueNext != mealDiscussionAdvance {
		t.Fatalf("解释之后缺少劝素窗口: %+v", s.Dialogue)
	}
	return e, s
}

func TestMealEncouragementWaitsUntilAfterPersuasionWindow(t *testing.T) {
	e, s := mealAtPersuasionWindow(t)
	if s.Flags["refectory_discussion_linlan"] || s.Flags["refectory_discussion_xuzhi"] {
		t.Fatal("玩家劝素之前提前播放了劝肉对白")
	}
	// A conversation restarts the same quiet window without consuming it.
	e.Apply(&s, "陆沉，今天这里人多吗")
	if s.DialogueNext != mealDiscussionAdvance || s.Flags["refectory_discussion_linlan"] {
		t.Fatal("闲聊跳过了玩家劝素窗口")
	}
	e.Apply(&s, s.DialogueNext)
	if s.Dialogue.Speaker != "林岚" || !strings.Contains(s.Dialogue.Text, "肉粥应该也没关系") || s.DialogueNext != mealDiscussionAdvance {
		t.Fatalf("未劝素时没有按顺序进入讨论: %+v", s.Dialogue)
	}
	e.Apply(&s, s.DialogueNext)
	if s.Dialogue.Speaker != "许栀" || s.Dialogue.Text != "想吃肉的就吃肉，又没关系，反正是寺庙的人照顾我们。" || s.DialogueNext != "自动结束晚膳" {
		t.Fatalf("许栀宽慰对白错误: %+v", s.Dialogue)
	}
	for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
		if s.Flags["meal_"+person+"_ate"] {
			t.Fatalf("宽慰对白擅自替%s吃肉", person)
		}
	}
}

func TestTimelyVegetarianGroupPersuasionSuppressesMeatEncouragement(t *testing.T) {
	for _, request := range []string{"劝大家吃素菜和馒头", "劝大家吃素材和馒头", "大家还是吃素吧", "大家别吃肉粥，换馒头吧", "劝大家不要吃粥", "大家还是尊重寺庙，吃馒头和素菜吧"} {
		t.Run(request, func(t *testing.T) {
			e, s := mealAtPersuasionWindow(t)
			e.Apply(&s, request)
			if s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" || !strings.Contains(s.Dialogue.Text, "尊重一下") {
				t.Fatalf("劝素后没有回应并进入用膳: shot=%s next=%s dialogue=%+v", s.ShotKey, s.DialogueNext, s.Dialogue)
			}
			for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
				if !s.Flags["meal_"+person+"_refused"] || s.Flags["meal_"+person+"_ate"] {
					t.Fatalf("劝素未记录%s的选择: %v", person, s.Flags)
				}
			}
			// Restoring the state or a stale continuation cannot reopen the
			// skipped pro-meat lines after the accepted vegetarian meal.
			s = Clone(s)
			e.Apply(&s, mealDiscussionAdvance)
			if !strings.Contains(s.Dialogue.Text, "吃完") || s.Flags["refectory_discussion_linlan"] || s.Flags["refectory_discussion_xuzhi"] {
				t.Fatalf("已劝素后又恢复了劝肉对白: %+v", s.Dialogue)
			}
		})
	}
}

func TestGroupMealRepliesKeepEachCompanionVoiceSeparate(t *testing.T) {
	e, s := mealAtPersuasionWindow(t)
	e.Apply(&s, "劝大家吃素材和馒头")
	for _, speaker := range []string{"林岚", "周砚", "许栀"} {
		if s.Dialogue.Speaker != speaker || s.Dialogue.Text == "" || !s.Flags["meal_group_pending"] && speaker != "许栀" {
			t.Fatalf("集体劝素没有按角色逐句回应: want=%s state=%+v", speaker, s)
		}
		e.Apply(&s, "自动离开斋堂")
	}
	if s.Dialogue.Speaker != "许栀" || s.Dialogue.Text != "吃完了，大家一起走吧。" {
		t.Fatalf("逐人对白结束后没有进入收碗对白: %+v", s.Dialogue)
	}
}

func TestVegetarianPersuasionBetweenCompanionLinesSkipsRemainingEncouragement(t *testing.T) {
	e, s := mealAtPersuasionWindow(t)
	e.Apply(&s, mealDiscussionAdvance)
	e.Apply(&s, "劝大家换馒头和素菜")
	if !strings.Contains(s.Dialogue.Text, "尊重一下") || s.Flags["refectory_discussion_xuzhi"] || !s.Flags["refectory_discussion_done"] {
		t.Fatalf("林岚说话后仍未阻止后续劝肉: %+v flags=%v", s.Dialogue, s.Flags)
	}
}

func TestIndividualVegetarianChoiceDoesNotLaterEncourageMeat(t *testing.T) {
	e, s := mealAtPersuasionWindow(t)
	e.Apply(&s, "劝许栀别吃粥，换馒头")
	advanceMealDiscussion(t, e, &s)
	if s.Dialogue.Speaker != "许栀" || !strings.Contains(s.Dialogue.Text, "尊重一下") || strings.Contains(s.Dialogue.Text, "想吃肉的就吃肉") {
		t.Fatalf("已拒肉的许栀仍然劝肉: %+v", s.Dialogue)
	}
}

func TestJudgedGroupVegetarianRequestUsesTheSameSafeContinuation(t *testing.T) {
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	e := NewEngine(catalog)
	s := e.Initial("judged-meal-discussion")
	storyCommands(e, &s, "登记入住", "去斋堂", "继续听", "继续听")
	judge := &fakeStoryJudge{meal: MealJudgeResult{Decisions: map[string]MealDecision{
		"linlan":  {Choice: "refused", Reply: "听你的。", Confidence: .9},
		"zhouyan": {Choice: "refused", Reply: "好。", Confidence: .9},
		"xuzhi":   {Choice: "refused", Reply: "也行。", Confidence: .9},
	}}}
	e.SetStoryJudge(judge)
	e.Apply(&s, "劝大家吃素菜和馒头")
	if judge.mealCalls != 1 || s.ShotKey != "refectory_eating" || s.DialogueNext != "自动离开斋堂" || !strings.Contains(s.Dialogue.Text, "尊重一下") {
		t.Fatalf("JEV集体劝素没有接到吃素分支: calls=%d next=%s dialogue=%+v", judge.mealCalls, s.DialogueNext, s.Dialogue)
	}
	for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
		if !s.Flags["meal_"+person+"_refused"] {
			t.Fatalf("JEV结果未记录%s的选择", person)
		}
	}
}

func TestMealChoiceDuringEatingKeepsTheMealHandoff(t *testing.T) {
	e, s := mealAtPersuasionWindow(t)
	e.Apply(&s, "我吃馒头")
	e.Apply(&s, "劝许栀别吃粥，换馒头")
	if s.DialogueNext != "自动离开斋堂" || s.ShotKey != "refectory_eating" {
		t.Fatalf("用膳中劝素丢失了收碗衔接: next=%s shot=%s", s.DialogueNext, s.ShotKey)
	}
}

func TestMeatFollowupOnlyShowsTheKeepersGlance(t *testing.T) {
	for _, question := range []string{"为什么会有肉？", "谁供的肉？", "寺庙里怎么会有肉呢"} {
		t.Run(question, func(t *testing.T) {
			e, s := mealAtPersuasionWindow(t)
			before := Clone(s)
			intent, speak := e.Apply(&s, question)
			if intent != "inspect" || speak != "" || s.Dialogue != (Dialogue{}) || s.ShotKey != "refectory_glance" || s.DialogueNext != "" || !strings.Contains(s.SceneText, "又把视线收回来") {
				t.Fatalf("追问供肉没有只用动作反馈: intent=%s speak=%q shot=%s dialogue=%+v", intent, speak, s.ShotKey, s.Dialogue)
			}
			if !reflect.DeepEqual(before.Flags, s.Flags) || before.Devotion != s.Devotion {
				t.Fatal("追问供肉改变了进食或虔诚结算")
			}
			e.Apply(&s, "看帘后")
			if s.Dialogue.Speaker != "慧普" || s.ShotKey != "refectory_curtain" {
				t.Fatal("主动看帘后没有进入慧普支线")
			}
		})
	}
}

func TestVegetarianQuestionsAreNotGroupPersuasion(t *testing.T) {
	for _, text := range []string{"大家要不要吃素", "大家喜欢吃馒头吗", "如果大家不吃肉粥", "不要劝大家吃素"} {
		if miniVegetarianGroupRequest(text) {
			t.Fatalf("把讨论或否定请求误当成劝素: %s", text)
		}
	}
}

func TestGroupPersuasionPreservesThePlayersOwnPorridgeChoice(t *testing.T) {
	for _, judged := range []bool{false, true} {
		for _, tt := range []struct {
			prior   string
			request string
		}{
			{request: "我吃肉粥，大家吃素菜吧"},
			{request: "大家吃素菜和馒头吧，我喝肉粥"},
			{request: "我劝大家吃素菜，我还是吃肉粥"},
			{prior: "我吃肉粥", request: "劝大家吃素菜和馒头"},
		} {
			e, s := mealAtPersuasionWindow(t)
			if judged {
				catalog, err := content.Load()
				if err != nil {
					t.Fatal(err)
				}
				e = NewEngine(catalog)
				e.SetStoryJudge(&fakeStoryJudge{meal: MealJudgeResult{Decisions: map[string]MealDecision{
					"linlan": {Choice: "refused"}, "zhouyan": {Choice: "refused"}, "xuzhi": {Choice: "refused"},
				}}})
			}
			if tt.prior != "" {
				e.Apply(&s, tt.prior)
			}
			e.Apply(&s, tt.request)
			if !s.Flags["meal_player_ate"] || s.Flags["meal_player_refused"] || !s.Flags["meal_linlan_refused"] || s.DialogueNext != "自动离开斋堂" {
				t.Fatalf("集体劝素覆盖了主角吃肉: judged=%v request=%s next=%s flags=%v", judged, tt.request, s.DialogueNext, s.Flags)
			}
			storyCommands(e, &s, "自动离开斋堂", "自动离开斋堂")
			if !s.Flags["skin_double_present"] || !s.Flags["meal_player_ate"] {
				t.Fatalf("收碗丢失了主角吃肉后果: judged=%v request=%s flags=%v", judged, tt.request, s.Flags)
			}
		}
	}
}

func TestRejectingVegetablesIsNotGroupVegetarianPersuasion(t *testing.T) {
	for _, request := range []string{"大家不要吃素菜，要喝肉粥", "大家别吃馒头，吃肉粥", "大家不用吃素", "别劝大家吃素"} {
		e, s := mealAtPersuasionWindow(t)
		e.Apply(&s, "我吃肉粥")
		before := Clone(s)
		e.Apply(&s, request)
		if !reflect.DeepEqual(before.Flags, s.Flags) || miniVegetarianGroupRequest(Normalize(request)) {
			t.Fatalf("否定素食被当成集体拒肉: request=%s flags=%v", request, s.Flags)
		}
	}
}

func TestExplicitChangeOfMindStillChangesThePlayersMeal(t *testing.T) {
	for _, request := range []string{"我不吃肉粥了", "我也不吃肉粥了，大家吃素吧"} {
		e, s := mealAtPersuasionWindow(t)
		e.Apply(&s, "我吃肉粥")
		e.Apply(&s, request)
		if !s.Flags["meal_player_refused"] || s.Flags["meal_player_ate"] {
			t.Fatalf("明确改选素食没有保留可逆选择: request=%s flags=%v", request, s.Flags)
		}
	}
}
