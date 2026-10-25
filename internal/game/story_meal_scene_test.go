package game

import (
	"reflect"
	"strings"
	"testing"
)

func TestRefectoryOpensWithNpcMealDiscussionBeforeChoices(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("meal-menu")
	storyCommands(e, &s, "登记入住", "去斋堂")
	for _, food := range []string{"粥", "馒头", "咸菜", "笋干", "香菇青菜"} {
		if !strings.Contains(s.SceneText, food) || !strings.Contains(strings.Join(s.SceneProps, "、"), food) {
			t.Fatalf("桌面没有呈现%s: text=%s props=%v", food, s.SceneText, s.SceneProps)
		}
	}
	if strings.Contains(s.SceneName, "肉") {
		t.Fatalf("人物发现前，场景标题提前泄露了肉粥: %s", s.SceneName)
	}

	e.Apply(&s, "继续听")
	if s.Dialogue.Speaker != "周砚" || !strings.Contains(s.Dialogue.Text, "粥里好像有肉") || !strings.Contains(s.Dialogue.Text, "想不想吃") {
		t.Fatalf("没有由同行者讨论是否吃肉粥并邀请大家决定: %+v", s.Dialogue)
	}
	if strings.Contains(s.Dialogue.Text, "为什么会有肉") || strings.Contains(s.Dialogue.Text, "和尚庙不是应该") {
		t.Fatalf("晚膳开场仍把讨论写成质疑寺庙: %s", s.Dialogue.Text)
	}
	e.Apply(&s, "继续听")
	if s.Dialogue.Speaker != "陆沉" || !strings.Contains(s.Dialogue.Text, "门边") {
		t.Fatalf("陆沉没有在边上说明选择: %+v", s.Dialogue)
	}
	for _, fact := range []string{"外来客", "吃不惯", "斋饭", "僧人自己不吃肉"} {
		if !strings.Contains(s.Dialogue.Text, fact) {
			t.Fatalf("解释缺少%s: %s", fact, s.Dialogue.Text)
		}
	}
	for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
		if s.Flags["meal_"+person+"_ate"] || s.Flags["meal_"+person+"_refused"] || s.Flags["meal_"+person+"_deferred"] {
			t.Fatalf("发现与解释替%s做了进食选择: %v", person, s.Flags)
		}
	}
}

func TestRefectoryQuestionsExplainGuestMeatWithoutSettlingMeal(t *testing.T) {
	for _, question := range []string{"和尚庙不是应该都吃素吗，为什么会有肉？", "粥里好像有肉", "你们吃肉吗"} {
		t.Run(question, func(t *testing.T) {
			e := newStoryTestEngine(t)
			s := e.Initial("meal-question")
			storyCommands(e, &s, "登记入住", "去斋堂")
			before := Clone(s)
			intent, speak := e.Apply(&s, question)
			if intent != "dialogue" || s.Dialogue.Speaker != "陆沉" || !strings.Contains(speak, "僧人自己不吃肉") {
				t.Fatalf("没有回答当下供荤疑问: intent=%s dialogue=%+v", intent, s.Dialogue)
			}
			if s.SceneKey != before.SceneKey || s.Devotion != before.Devotion || !reflect.DeepEqual(s.Flags, before.Flags) {
				t.Fatalf("追问供荤错误改变了游戏结算: %+v", s)
			}
		})
	}
}

func TestRefectoryVegetarianFoodCanBeInspectedAndChosen(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("meal-vegetarian")
	storyCommands(e, &s, "登记入住", "去斋堂")
	for _, question := range []string{"查看馒头", "查看咸菜", "查看素菜"} {
		intent, speak := e.Apply(&s, question)
		if intent != "inspect" || speak != "" || s.Dialogue != (Dialogue{}) || !strings.Contains(s.SceneText, "它们都是素的") {
			t.Fatalf("素食观察未通过画面呈现: intent=%s speak=%s scene=%s", intent, speak, s.SceneText)
		}
	}
	e.Apply(&s, "我换馒头")
	if !s.Flags["meal_player_refused"] || s.Flags["meal_player_ate"] {
		t.Fatalf("换馒头仍结算肉缘: %v", s.Flags)
	}
	storyCommands(e, &s, "劝许栀别吃粥，换馒头", "吃完晚膳", "自动离开斋堂", "自动离开斋堂")
	if !s.Flags["meal_xuzhi_refused"] || s.SceneKey != "mini_corridor_candle" || s.Flags["skin_double_present"] {
		t.Fatalf("素食晚膳没有保持安全后续: scene=%s flags=%v", s.SceneKey, s.Flags)
	}
}
