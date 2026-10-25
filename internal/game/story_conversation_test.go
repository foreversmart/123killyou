package game

import (
	"reflect"
	"strings"
	"testing"

	"nightwatch/internal/content"
)

func conversationTestEngine(t *testing.T) *Engine {
	t.Helper()
	catalog, err := content.Load()
	if err != nil {
		t.Fatal(err)
	}
	return NewEngine(catalog)
}

func TestUnmatchedStorySpeechNeverReplaysSceneOrChangesStory(t *testing.T) {
	e := conversationTestEngine(t)
	for _, scene := range []string{"mini_arrival", "mini_register", "mini_refectory", "mini_corridor_candle", "mini_room", "mini_wake_three_gongs", "mini_four_knocks", "mini_three_knocks", "mini_listen", "mini_oracle", "mini_double", "mini_dawn_trap", "mini_dawn"} {
		t.Run(scene, func(t *testing.T) {
			s := e.Initial("unmatched")
			e.setMiniScene(&s, scene)
			s.Dialogue = Dialogue{Speaker: "你·心声", Text: "上一句已说完的剧情", Portrait: "player"}
			s.LastAction = s.Dialogue.Text
			s.DialogueNext = ""
			before := Clone(s)
			intent, speak := e.Apply(&s, "我今天想聊聊宇宙飞船")
			if intent != "dialogue" && intent != "clarify" {
				t.Fatalf("闲聊被当成剧情：%s %s", intent, speak)
			}
			if speak == before.Dialogue.Text || (intent == "clarify" && !strings.Contains(speak, "宇宙飞船")) {
				t.Fatalf("未回应新发言：%q", speak)
			}
			if intent == "dialogue" && speak != "" {
				t.Fatal("闲聊不应复用固定剧情台词")
			}
			s.Dialogue, s.LastAction = before.Dialogue, before.LastAction
			if !reflect.DeepEqual(s, before) {
				t.Fatal("闲聊改变了剧情、镜头或道具")
			}
		})
	}
}

func TestStoryNamesAndFoodQuestionsAreNotMealConsent(t *testing.T) {
	e := conversationTestEngine(t)
	for _, text := range []string{"许栀", "林岚你昨天吃了什么", "周砚你喜欢吃什么", "你们大家都喝粥吗", "如果我吃肉粥会怎样", "我吃不吃都可以", "为什么下一句又重复"} {
		t.Run(text, func(t *testing.T) {
			s := e.Initial("meal-chat")
			e.setMiniScene(&s, "mini_refectory")
			before := Clone(s)
			e.Apply(&s, text)
			if !reflect.DeepEqual(s.Flags, before.Flags) || s.Devotion != before.Devotion {
				t.Fatalf("闲聊被结算成用餐：%v", s.Flags)
			}
		})
	}
}

func TestVegetarianCommandsNeverCreateMeatAffinity(t *testing.T) {
	e := conversationTestEngine(t)
	for _, tt := range []struct{ text, person string }{{"我吃馒头", "player"}, {"我吃点咸菜", "player"}, {"让许栀吃点咸菜", "xuzhi"}, {"劝林岚换馒头", "linlan"}, {"让周砚吃本地素菜", "zhouyan"}} {
		t.Run(tt.text, func(t *testing.T) {
			s := e.Initial("vegetarian")
			e.setMiniScene(&s, "mini_refectory")
			e.Apply(&s, tt.text)
			if s.Flags["meal_"+tt.person+"_ate"] || !s.Flags["meal_"+tt.person+"_refused"] {
				t.Fatalf("吃素被当成喝肉粥：%v", s.Flags)
			}
		})
	}
}

func TestStoryConversationKeepsAddressedSpeakerAndRejectsAbsentNPC(t *testing.T) {
	e := conversationTestEngine(t)
	s := e.Initial("target")
	intent, _ := e.Apply(&s, "周砚你知道宇宙飞船吗")
	if intent != "dialogue" || s.Dialogue.Speaker != "周砚" || s.Dialogue.Text != "" {
		t.Fatalf("没有选中被问到的人：%+v", s.Dialogue)
	}
	intent, _ = e.Apply(&s, "陆沉，你知道慧普平时喜欢什么吗")
	if intent != "dialogue" || s.Dialogue.Speaker != "陆沉" {
		t.Fatal("把问话中提到的人当成了交谈对象")
	}
	intent, speak := e.Apply(&s, "慧普你知道宇宙飞船吗")
	if intent != "clarify" || s.Dialogue.Speaker != "系统" || !strings.Contains(speak, "暂时没有") {
		t.Fatal("让不在场的人凭空回答")
	}
}

func TestMentioningReplayDoesNotRepeatThePreviousLine(t *testing.T) {
	e := conversationTestEngine(t)
	s := e.Initial("replay-request")
	e.Apply(&s, "听第一话")
	before := s.Dialogue.Text
	intent, speak := e.Apply(&s, "林岚，不要再说一遍旧话，你知道宇宙飞船吗")
	if intent == "replay" || speak == before {
		t.Fatal("提到重复台词被误当成重听指令")
	}
	e.Apply(&s, "听第一话")
	before = s.Dialogue.Text
	intent, speak = e.Apply(&s, "再说一遍")
	if intent != "replay" || speak != before {
		t.Fatal("明确重听指令失效")
	}
}
