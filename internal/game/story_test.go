package game

import (
	"encoding/json"
	"os"
	"testing"
	"testing/fstest"

	"nightwatch/internal/content"
)

func newStoryTestEngine(t *testing.T) *Engine {
	t.Helper()
	pack := fstest.MapFS{}
	for _, name := range []string{
		"items.json",
		"world.json",
		"npcs/keeper/profile.json",
		"npcs/keeper/prompt.md",
		"narrator/profile.json",
		"narrator/prompt.md",
	} {
		raw, err := os.ReadFile("../content/" + name)
		if err != nil {
			t.Fatal(err)
		}
		pack[name] = &fstest.MapFile{Data: raw}
	}
	var npc content.NPC
	if err := json.Unmarshal(pack["npcs/keeper/profile.json"].Data, &npc); err != nil {
		t.Fatal(err)
	}
	catalog, err := content.LoadFS(pack)
	if err != nil {
		t.Fatal(err)
	}
	return NewEngine(catalog)
}

func applyStory(t *testing.T, engine *Engine, state *State, command string) string {
	t.Helper()
	_, speak := engine.Apply(state, command)
	return speak
}

func TestMiniScriptCanReachDawnFromSafeChoices(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-safe")

	applyStory(t, engine, &state, "登记入住")
	if state.SceneKey != "mini_register" || !state.StoryMode {
		t.Fatalf("登记没有进入剧情场景: %+v", state)
	}
	applyStory(t, engine, &state, "去斋堂")
	applyStory(t, engine, &state, "我不吃肉粥")
	applyStory(t, engine, &state, "劝大家不要吃粥")
	applyStory(t, engine, &state, "吃完晚膳")
	applyStory(t, engine, &state, "拿红烛")
	applyStory(t, engine, &state, "回自己的房间")
	applyStory(t, engine, &state, "点燃红烛")
	applyStory(t, engine, &state, "阅读清心静神经")
	applyStory(t, engine, &state, "睡下")
	if state.SceneKey != "mini_wake_three_gongs" {
		t.Fatalf("睡下后未进入三声锣场景: %s", state.SceneKey)
	}
	applyStory(t, engine, &state, "续燃红烛")
	applyStory(t, engine, &state, "不开门并问是谁")
	applyStory(t, engine, &state, "跟同伴去偷听住持")
	applyStory(t, engine, &state, "模仿猫叫")
	applyStory(t, engine, &state, "不开门等待真正的五更")
	applyStory(t, engine, &state, "坐大巴回家")

	if state.SceneKey != "mini_ending" || !state.Flags["story_finished"] || state.Flags["story_dead"] {
		t.Fatalf("安全路线未完成: scene=%s flags=%v", state.SceneKey, state.Flags)
	}
}

func TestMiniScriptRedCandleDeathCanRestart(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-death")

	applyStory(t, engine, &state, "登记入住")
	applyStory(t, engine, &state, "去斋堂")
	applyStory(t, engine, &state, "我不吃")
	applyStory(t, engine, &state, "吃完晚膳")
	applyStory(t, engine, &state, "拿红烛")
	applyStory(t, engine, &state, "回房")
	applyStory(t, engine, &state, "点燃红烛")
	applyStory(t, engine, &state, "睡下")
	intent, _ := engine.Apply(&state, "不续燃红烛")
	if intent != "death" || !state.Flags["story_dead"] {
		t.Fatalf("未按规则进入死亡: intent=%s flags=%v", intent, state.Flags)
	}
	intent, _ = engine.Apply(&state, "重新开始")
	if intent != "reset" || state.SceneKey != "mini_arrival" || !state.StoryMode {
		t.Fatalf("死亡后不能重开: intent=%s scene=%s story=%t", intent, state.SceneKey, state.StoryMode)
	}
}

func TestMiniScriptAllEatRequiresAnimalCall(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-meat")

	for _, command := range []string{
		"登记入住",
		"去斋堂",
		"大家都吃",
		"吃完晚膳",
		"拿红烛",
		"回房",
		"点燃红烛",
		"睡下",
		"续燃红烛",
		"不开门",
		"跟同伴去偷听",
	} {
		applyStory(t, engine, &state, command)
	}
	if !state.Flags["skin_double_present"] || state.Flags["companion_present"] {
		t.Fatalf("全员吃粥分支状态错误: %v", state.Flags)
	}
	intent, _ := engine.Apply(&state, "跑回自己的房间并关门")
	if intent != "death" || !state.Flags["story_dead"] {
		t.Fatalf("全员吃粥未强制动物拟声: intent=%s flags=%v", intent, state.Flags)
	}
}

func TestMiniScriptSkinDoubleCanBeCalmedByTheReadScripture(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-double")

	for _, command := range []string{
		"登记入住",
		"去斋堂",
		"我吃肉粥",
		"吃完晚膳",
		"拿红烛",
		"回房",
		"点燃红烛",
		"阅读清心静神经",
		"睡下",
		"续燃红烛",
		"不开门",
		"跟同伴去偷听",
		"模仿鸟叫",
	} {
		applyStory(t, engine, &state, command)
	}
	if state.SceneKey != "mini_double" || !state.Flags["skin_double_present"] {
		t.Fatalf("吃粥后没有进入换皮同伴分支: scene=%s flags=%v", state.SceneKey, state.Flags)
	}
	applyStory(t, engine, &state, "我不吹灭红烛")
	applyStory(t, engine, &state, "朗读清心静神经")
	if state.SceneKey != "mini_dawn_trap" || !state.Flags["double_calm"] {
		t.Fatalf("清心偈没有安抚换皮同伴: scene=%s flags=%v", state.SceneKey, state.Flags)
	}
}
