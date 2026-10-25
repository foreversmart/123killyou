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
	applyStory(t, engine, &state, "不开门")
	applyStory(t, engine, &state, "跟同伴去偷听住持")
	applyStory(t, engine, &state, "模仿猫叫")
	applyStory(t, engine, &state, "不开门等待真正的五更")
	applyStory(t, engine, &state, "继续听")
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
	for _, command := range []string{"朗读清心静神经", "继续念经", "继续念经", "继续念经", "继续听", "继续听"} {
		applyStory(t, engine, &state, command)
	}
	if state.SceneKey != "mini_dawn_trap" || !state.Flags["double_calm"] {
		t.Fatalf("清心偈没有安抚换皮同伴: scene=%s flags=%v", state.SceneKey, state.Flags)
	}
}

func TestMiniScriptKeepsSceneActorsWithoutNarratingCandleAction(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-staging")
	if len(state.Actors) < 5 || state.Actors[1].Name != "林岚" {
		t.Fatalf("山门没有完整演员站位: %+v", state.Actors)
	}
	applyStory(t, engine, &state, "登记入住")
	applyStory(t, engine, &state, "去斋堂")
	applyStory(t, engine, &state, "我不吃肉粥")
	applyStory(t, engine, &state, "吃完晚膳")
	applyStory(t, engine, &state, "拿红烛")
	applyStory(t, engine, &state, "回房")
	applyStory(t, engine, &state, "点燃红烛")
	if state.Dialogue != (Dialogue{}) || state.SceneText == "" || state.LastAction != state.SceneText {
		t.Fatalf("点烛未通过画面呈现: %+v", state)
	}
	if len(state.Actors) != 2 || state.Actors[0].Position != "门房矮桌前" {
		t.Fatalf("门房演员站位不完整: %+v", state.Actors)
	}
}

func TestMiniScriptFirstChapterStagesEverySpeaker(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-arrival")
	for index, want := range []string{"林岚", "许栀", "林岚", "周砚", "许栀", "陆沉", "你·心声"} {
		commands := map[int]string{0: "听第一话", 1: "继续听", 2: "继续听", 3: "继续听", 4: "继续听", 5: "继续听", 6: "继续听"}
		intent, _ := engine.Apply(&state, commands[index])
		if intent != "story" || state.Dialogue.Speaker != want {
			t.Fatalf("第一话第 %d 句说话者错误: intent=%s dialogue=%+v", index+1, intent, state.Dialogue)
		}
	}
	if !state.Flags["arrival_intro_done"] {
		t.Fatal("第一话结束后没有记录完成状态")
	}
}

func TestMiniScriptRequiresObservedAnimalCall(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-sounds")
	for _, command := range []string{
		"登记入住", "去斋堂", "我不吃", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下",
		"续燃红烛", "不开门", "跟同伴去偷听",
	} {
		applyStory(t, engine, &state, command)
	}
	if _, speak := engine.Apply(&state, "检查猫食碟"); state.Dialogue != (Dialogue{}) || speak != "" || state.ShotKey != "listen_cat" {
		t.Fatalf("检查猫食碟未通过现场声音呈现: %+v", state)
	}
	intent, _ := engine.Apply(&state, "模仿猫叫")
	if intent == "clarify" || !state.Flags["animal_call_passed"] {
		t.Fatalf("听过猫叫后仍不能模仿: intent=%s flags=%v", intent, state.Flags)
	}
}

func TestMiniScriptDawnMiscountSpeaksBeforeDanger(t *testing.T) {
	engine := newStoryTestEngine(t)
	state := engine.Initial("story-dawn-trap")
	for _, command := range []string{
		"登记入住", "去斋堂", "我不吃", "吃完晚膳", "拿红烛", "回房", "点燃红烛", "睡下",
		"续燃红烛", "不开门", "跟同伴去偷听", "模仿猫叫", "把钟声算作第六声",
	} {
		applyStory(t, engine, &state, command)
	}
	if state.Dialogue.Speaker != miniDoubleName(&state)+"（门外）" || !state.Flags["fake_dawn_knocks"] {
		t.Fatalf("误判五更没有先出现假人三敲对白: %+v flags=%v", state.Dialogue, state.Flags)
	}
}
