package game

var miniDebugSceneOrder = []string{
	"mini_arrival", "mini_register", "mini_refectory", "mini_corridor_candle", "mini_room",
	"mini_wake_three_gongs", "mini_four_knocks", "mini_three_knocks", "mini_listen", "mini_oracle",
	"mini_double", "mini_dawn_trap", "mini_dawn", "mini_ending",
}

func (e *Engine) skipMiniScene(state *State) (string, string) {
	if !state.StoryMode {
		return "debug_skip", feedback(state, "当前不是剧情模式，无法跳到下一剧情场景。")
	}
	source := state.SceneKey
	if source == "mini_death" {
		source = state.RetryScene
	}
	index := -1
	for position, key := range miniDebugSceneOrder {
		if key == source {
			index = position
			break
		}
	}
	if index < 0 {
		return "debug_skip", miniSystem(state, "当前没有可继续的剧情场景。")
	}
	if index == len(miniDebugSceneOrder)-1 {
		state.DialogueNext = ""
		return "debug_skip", miniSystem(state, "这一夜已经结束，后面没有新的剧情场景。")
	}
	target := miniDebugSceneOrder[index+1]
	e.prepareMiniDebugScene(state, index+1)
	state.Paused, state.Caught = false, false
	state.RetryScene = ""
	state.Effect = Effect{Kind: "none"}
	delete(state.Flags, "story_dead")
	miniSetFlag(state, "debug_scene_skipped")
	e.setMiniScene(state, target)
	state.DialogueNext = ""
	return "debug_skip", miniDebugOpening(state)
}

// Supply only prerequisites of the target. Existing meal decisions, discoveries
// and clues remain authoritative; optional scenes are included for inspection.
func (e *Engine) prepareMiniDebugScene(state *State, index int) {
	miniSetFlag(state, "arrived")
	if index >= 1 {
		miniSetFlag(state, "checked_in")
		e.grantStoryItems(state, "key", "beads")
		if !state.Flags["page_left"] {
			e.grantStoryItems(state, "page")
		}
		if !state.Flags["permit_returned"] {
			e.grantStoryItems(state, "permit")
		}
	}
	if index >= 2 {
		miniSetFlag(state, "luggage_placed")
	}
	if index >= 3 {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			prefix := "meal_" + person + "_"
			if !state.Flags[prefix+"ate"] && !state.Flags[prefix+"refused"] && !state.Flags[prefix+"deferred"] {
				miniChooseMeal(state, person, "refused")
			}
		}
		miniSetFlag(state, "meal_done")
		state.Flags["meal_all_ate"] = state.Flags["meal_player_ate"] && allCompanionsAte(state)
		state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
	}
	if index >= 4 {
		e.grantStoryItems(state, "candle")
		miniSetFlag(state, "red_candle_held")
		miniSetFlag(state, "red_candle_lit")
	}
	if index >= 5 {
		miniSetFlag(state, "mind_script_learned")
		miniSetFlag(state, "slept_before_three_gongs")
		miniSetFlag(state, "candle_went_out")
		state.Flags["red_candle_lit"] = index != 5
	}
	if index >= 6 {
		miniSetFlag(state, "candle_relit")
	}
	if index >= 7 {
		miniSetFlag(state, "four_knocks_survived")
	}
	if index >= 8 {
		miniSetFlag(state, "companion_checked")
		miniSetFlag(state, "listen_route_started")
		miniSetFlag(state, "cat_call_heard")
		miniSetFlag(state, "bird_call_heard")
		state.Flags["companion_present"] = miniCompanionID(state) != ""
	}
	if index == 8 {
		delete(state.Flags, "skin_seen")
		delete(state.Flags, "vase_broken")
	}
	if index >= 9 {
		miniSetFlag(state, "skin_seen")
		miniSetFlag(state, "vase_broken")
	}
	if index == 9 {
		clearMiniDebugFlags(state, "oracle_question", "cup_cast_counted", "cup_jiao_rescue", "cup_failed", "cup_roll_sacred", "cup_roll_laugh", "cup_roll_dark")
	}
	if index == 10 {
		miniSetFlag(state, "skin_double_present")
		clearMiniDebugFlags(state, "double_calm", "double_frenzy", "double_refused_candle", "double_scripture_1", "double_scripture_2", "double_scripture_3", "double_scripture_4")
	}
	if index == 11 {
		clearMiniDebugFlags(state, "fake_dawn_knocks", "dawn_waited")
	}
	if index >= 12 {
		miniSetFlag(state, "dawn_waited")
	}
	if index == 13 {
		miniSetFlag(state, "story_finished")
	}
}

func clearMiniDebugFlags(state *State, flags ...string) {
	for _, flag := range flags {
		delete(state.Flags, flag)
	}
}

func miniDebugOpening(state *State) string {
	switch state.SceneKey {
	case "mini_register":
		return miniDialogue(state, "陆沉", "四位施主，先把名字写清楚。钥匙只开各自的房，通行凭收好；背面那句‘只许去，不许问’，夜里认路时再看。")
	case "mini_refectory":
		return miniDialogue(state, "陆沉", "粥、素饼和热水都在，想吃什么由施主自己决定。")
	case "mini_corridor_candle":
		return miniDialogue(state, "陆沉", "晚膳收了。跟我回东院，路上每人领一支红烛。")
	case "mini_room":
		return miniObserve(state, "门房的门关上，红烛已经点稳，桌上的寺史册和《清心静神经》还没有收起。")
	case "mini_wake_three_gongs":
		return miniObserve(state, "黑场中响起三声沉闷的锣。烛芯已经黑了，月光移过门缝，外面传来湿重的呼吸。")
	case "mini_four_knocks":
		return miniObserve(state, "火光先照出门闩上的水痕，烛芯才重新立起。四下敲门之后，门外没有脚步，压在门闩上的手收了回来。")
	case "mini_three_knocks":
		if miniCompanionID(state) != "" {
			return miniDialogue(state, miniCompanionName(state)+"（门外）", miniCompanionLine(state)+" 先别开门，沿墙走，别惊动里面的人。")
		}
		return miniObserve(state, "三下敲门从走廊传来。熟悉的声音反复说着‘跟我来’，没有说出私物的细节。")
	case "mini_listen":
		if state.Flags["companion_present"] {
			return miniDialogue(state, miniCompanionName(state), "别踩中间的砖，沿着墙走。半掩房门里，慧普像是背对着我们，先别惊动他。")
		}
		return miniObserve(state, "视线贴着墙向半掩房门移动。猫食碟旁先叫了一声，半掩房门里传来撕裂声，脚后跟旁就是花瓶。")
	case "mini_oracle":
		return miniObserve(state, "偏灯在地上拖出窄光，杯筊桌出现在殿侧。身后的脚步由远及近，与穿堂风错开。")
	case "mini_double":
		return miniObserve(state, "隔壁先响起门闩，门缝里伸进一只熟悉的鞋。同行人撞进门房，红烛照亮了衣服，影子的边缘却缺了一块。")
	case "mini_dawn_trap":
		return miniObserve(state, "五声更锣停下后，另一声才从更远的地方过来。窗纸仍然黑着，红烛还亮着。")
	case "mini_dawn":
		return miniObserve(state, "五声更锣再次响起。鸡鸣先起，檐鸟跟着应声，晨光才越过东院；林岚、周砚、许栀都站在各自的房门前。")
	default:
		return miniObserve(state, "四只行李放进大巴，车门合拢。晨雾退到车后，后视镜里‘明照寺’三个旧字闪了一下。")
	}
}
