package game

import "testing"

func TestStoryMealQuestionAndDeferralAreNotRefusal(t *testing.T) {
	e := newStoryTestEngine(t)
	s := e.Initial("questions")
	storyCommands(e, &s, "登记入住", "去斋堂")
	for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
		e.Apply(&s, "问"+miniPersonName(person)+"吃不吃粥")
		for _, choice := range []string{"ate", "refused", "deferred"} {
			if s.Flags["meal_"+person+"_"+choice] {
				t.Fatalf("询问被替换为选择: %s %v", person, s.Flags)
			}
		}
		if s.Dialogue.Speaker != miniPersonName(person) {
			t.Fatal("没有让被问到的人回答")
		}
	}
	e.Apply(&s, "暂缓")
	if !s.Flags["meal_player_deferred"] || s.Flags["meal_player_refused"] {
		t.Fatal("暂缓被误记为拒绝")
	}
}

func TestStoryOracleQuestionMustPrecedeTheCast(t *testing.T) {
	e, s := storyAtListen(t, false)
	e.Apply(&s, "跑向大殿")
	e.Apply(&s, "掷杯筊")
	if s.Flags["cup_cast_counted"] || s.Flags["oracle_question"] || s.Dialogue.Speaker != "神公" {
		t.Fatal("未确认问题就掷筊")
	}
	storyCommands(e, &s, "确认求回门房", "掷杯筊")
	if !s.Flags["cup_cast_counted"] || s.ShotKey != "oracle_cast" {
		t.Fatal("确认后不能投掷")
	}
}

func TestStoryRequestedPropCommandsHaveSpecificSpeakers(t *testing.T) {
	e := newStoryTestEngine(t)
	for _, tt := range []struct{ scene, command, speaker string }{
		{"mini_register", "查看铜钥匙", "陆沉"},
		{"mini_refectory", "搅动肉粥", "周砚"},
		{"mini_corridor_candle", "听回廊声音", "陆沉"},
		{"mini_corridor_candle", "看看钟楼门", "陆沉"},
		{"mini_room", "检查门闩", ""},
		{"mini_oracle", "看引路红烛", "神公"},
		{"mini_oracle", "检查鸟笼", ""},
		{"mini_dawn", "看看照片", "林岚"},
		{"mini_dawn", "看看门轴", "周砚"},
		{"mini_dawn", "整理行李", "许栀"},
		{"mini_dawn", "交还通行凭", "陆沉"},
	} {
		t.Run(tt.command, func(t *testing.T) {
			s := e.Initial("props")
			e.setMiniScene(&s, tt.scene)
			e.Apply(&s, tt.command)
			if s.Dialogue.Speaker != tt.speaker {
				t.Fatalf("道具被错误角色解释: %+v", s.Dialogue)
			}
		})
	}
}
