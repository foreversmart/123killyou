package game

import (
	"strings"
	"testing"
)

func TestStoryDevotionEventIsBoundedAndAppliedOnce(t *testing.T) {
	state := State{Devotion: 99, Flags: map[string]bool{}}
	if !applyDevotionEvent(&state, "devotion_gate_seen", DevotionGateLookDelta) {
		t.Fatal("首次虔诚事件没有应用")
	}
	if state.Devotion != 100 || !state.Flags["devotion_gate_seen"] {
		t.Fatalf("虔诚度没有封顶或事件标记缺失: %+v", state)
	}
	if applyDevotionEvent(&state, "devotion_gate_seen", DevotionGateLookDelta) {
		t.Fatal("同一虔诚事件被重复应用")
	}
	if state.Devotion != 100 {
		t.Fatalf("重复事件改变了已封顶虔诚度: %d", state.Devotion)
	}

	state = State{Devotion: 1, Flags: map[string]bool{}}
	if !applyDevotionEvent(&state, "devotion_skin_seen", DevotionSkinWitnessDelta) {
		t.Fatal("负向虔诚事件没有应用")
	}
	if state.Devotion != 0 {
		t.Fatalf("虔诚度没有封底: %d", state.Devotion)
	}
}

func TestStoryDevotionCandlePenaltyContinuesUntilRelit(t *testing.T) {
	state := State{
		StoryMode: true,
		Devotion:  5,
		Flags: map[string]bool{
			"candle_went_out": true,
		},
	}
	engine := &Engine{}
	engine.reconcileStoryDevotion(&state)
	engine.reconcileStoryDevotion(&state)
	if state.Devotion != 3 || state.CandleUnlitTurns != 2 {
		t.Fatalf("红烛熄灭期间没有持续扣减: devotion=%d turns=%d", state.Devotion, state.CandleUnlitTurns)
	}

	state.Flags["red_candle_lit"] = true
	engine.reconcileStoryDevotion(&state)
	if state.Devotion != 3 || state.CandleUnlitTurns != 2 {
		t.Fatalf("重新点燃红烛后仍在扣减: devotion=%d turns=%d", state.Devotion, state.CandleUnlitTurns)
	}
}

func TestStoryDevotionHostileDoorDialogueIsRepeatable(t *testing.T) {
	state := State{Devotion: 5, Flags: map[string]bool{}}
	recordGhostDialogue(&state)
	recordGhostDialogue(&state)
	if state.Devotion != 1 || state.GhostDialogueTurns != 2 || !state.Flags["ghost_dialogue_started"] {
		t.Fatalf("门外鬼声对话没有逐次扣减: devotion=%d turns=%d flags=%v", state.Devotion, state.GhostDialogueTurns, state.Flags)
	}
	recordGhostDialogue(&state)
	if state.Devotion != 0 {
		t.Fatalf("鬼声对话扣减突破了虔诚度下限: %d", state.Devotion)
	}
}

func TestLowDevotionSleepBringsMultipleMonstersToTheDoor(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("low-devotion")
	state.Devotion = LowDevotionMonsterThreshold
	for _, command := range []string{
		"登记入住",
		"去斋堂",
		"我不吃肉粥",
		"吃完晚膳",
		"拿红烛",
		"回自己的房间",
		"点燃红烛",
		"睡下",
	} {
		engine.Apply(&state, command)
	}
	if state.SceneKey != "mini_wake_three_gongs" || !state.Flags["low_devotion_monsters"] {
		t.Fatalf("低虔诚入睡后没有触发多重撞门: scene=%s flags=%v", state.SceneKey, state.Flags)
	}
	if !strings.Contains(state.SceneText, "撞击") {
		t.Fatalf("低虔诚事件没有反馈撞门: %q", state.SceneText)
	}
}

func TestStoryDevotionChangesForDeclaredEvents(t *testing.T) {
	tests := []struct {
		name     string
		commands []string
		want     int
	}{
		{
			name:     "gate and buddha",
			commands: []string{"看寺庙", "看佛像"},
			want:     68 + DevotionGateLookDelta + DevotionBuddhaLookDelta,
		},
		{
			name:     "meat porridge",
			commands: []string{"登记入住", "去斋堂", "吃肉粥"},
			want:     68 + DevotionMeatPorridgeDelta,
		},
		{
			name:     "successful persuasion",
			commands: []string{"登记入住", "去斋堂", "劝大家不要吃粥"},
			want:     68 + DevotionPersuadeRefusalDelta,
		},
		{
			name: "read scripture",
			commands: []string{
				"登记入住", "去斋堂", "我不吃", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "看经文",
			},
			want: 68 + DevotionScriptureDelta,
		},
		{
			name: "witness skinning",
			commands: []string{
				"登记入住", "去斋堂", "我不吃", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下", "续燃红烛", "不开门", "跟同伴去偷听", "观察屋内",
			},
			want: 68 + DevotionCandleUnlitDelta + DevotionSkinWitnessDelta,
		},
		{
			name: "answer hostile knock",
			commands: []string{
				"登记入住", "去斋堂", "我不吃", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下", "续燃红烛", "回答姓名",
			},
			want: 68 + DevotionCandleUnlitDelta + DevotionGhostDialogueDelta,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			engine := newStoryTestEngine(t)
			state := engine.Initial("devotion-events")
			for _, command := range tt.commands {
				engine.Apply(&state, command)
			}
			if state.Devotion != tt.want {
				t.Fatalf("虔诚度结算错误: got=%d want=%d flags=%v", state.Devotion, tt.want, state.Flags)
			}
		})
	}
}
