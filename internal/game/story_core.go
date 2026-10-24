package game

import "strings"

func (e *Engine) story(state *State, text string) (string, string, bool) {
	if !state.StoryMode {
		// Fresh saves already contain the first scene. Only consume a command
		// when it belongs to the mini-script; legacy debug/dialogue commands
		// must continue to use the original engine path.
		if state.SceneKey == "mini_arrival" && miniHasAny(text, "登记入住", "办理入住", "登记", "报到", "写名字", "放行李", "看看山门", "观察山门", "看铜铃", "看看花猫", "环顾") {
			state.StoryMode = true
		} else if !miniHasAny(text, "开始旅行", "开始剧情", "开始游览", "抵达山门", "下车") {
			return "", "", false
		} else {
			state.StoryMode = true
		}
		miniSetFlag(state, "arrived")
		e.setMiniScene(state, "mini_arrival")
		if miniHasAny(text, "开始旅行", "开始剧情", "开始游览", "抵达山门", "下车") {
			return "story", miniSystem(state, "你从大巴下车。阳光很好，灯影寺的山门近在眼前。可以说‘登记入住’，也可以先看看山门。"), true
		}
	}

	if state.Flags["story_dead"] {
		if miniHasAny(text, "重新开始", "重来一遍", "重置这一夜", "再试一次") {
			reset := e.Initial(state.ID)
			reset.StoryMode = true
			reset.Flags["arrived"] = true
			*state = reset
			return "reset", miniSystem(state, "第一夜重新开始。你重新站在灯影寺山门前。"), true
		}
		return "dead", miniSystem(state, "这一条路线已经结束。说‘重新开始’，可以从灯影寺山门再来一次。"), true
	}

	switch state.SceneKey {
	case "mini_arrival":
		return e.storyArrival(state, text)
	case "mini_register":
		return e.storyRegister(state, text)
	case "mini_refectory":
		return e.storyRefectory(state, text)
	case "mini_corridor_candle":
		return e.storyCandleCorridor(state, text)
	case "mini_room":
		return e.storyRoom(state, text)
	case "mini_wake_three_gongs":
		return e.storyWake(state, text)
	case "mini_four_knocks":
		return e.storyFourKnocks(state, text)
	case "mini_three_knocks":
		return e.storyThreeKnocks(state, text)
	case "mini_listen":
		return e.storyListen(state, text)
	case "mini_oracle":
		return e.storyOracle(state, text)
	case "mini_double":
		return e.storyDouble(state, text)
	case "mini_dawn_trap":
		return e.storyDawnTrap(state, text)
	case "mini_dawn":
		return e.storyDawn(state, text)
	case "mini_ending":
		return "story", miniSystem(state, "这一夜已经结束。你可以查看手记，或说‘重新开始’重走浓缩路线。"), true
	default:
		return "story", miniSystem(state, "你还在灯影寺的这一夜。请说出要调查或执行的动作。"), true
	}
}

func (e *Engine) storyArrival(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看看山门", "观察山门", "看铜铃", "看看花猫", "环顾") {
		miniSetFlag(state, "gate_seen")
		miniClue(state, "山门新匾下露出旧字‘明照寺’，铜铃旁有一只晒太阳的花猫")
		return "inspect", miniSystem(state, "新匾写着灯影寺，侧面旧匾还能看见‘明照寺’。山门铜铃没有被风碰响。"), true
	}
	if miniHasAny(text, "登记入住", "办理入住", "登记", "报到", "写名字", "放行李") {
		miniSetFlag(state, "checked_in")
		e.setMiniScene(state, "mini_register")
		return "move", miniDialogue(state, "陆沉", "四位施主把名字写在灯下。钥匙只开各自的房，通行凭收好，背面写着‘只许去，不许问’。"), true
	}
	return "story", miniSystem(state, "山门前阳光正好。你可以先看看山门，也可以说‘登记入住’。"), true
}

func (e *Engine) storyRegister(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看登记簿", "看看登记", "看房牌", "看残页", "查看通行凭") {
		miniSetFlag(state, "registration_seen")
		miniClue(state, "东院四间偏房分别标为听、灯、纸、门；登记簿边角有被反复划掉的旧名字")
		return "inspect", miniSystem(state, "登记桌上挂着‘听、灯、纸、门’四把房牌。陆沉把铜钥匙和暗红印章的通行凭交给你。"), true
	}
	if miniHasAny(text, "去斋堂", "去斋房", "去吃饭", "晚膳", "晚饭", "吃晚饭") {
		e.setMiniScene(state, "mini_refectory")
		return "move", miniDialogue(state, "陆沉", "先去斋堂。粥和素饼都在，想吃什么由施主自己决定。"), true
	}
	if miniHasAny(text, "谁是守夜人", "你是谁", "为什么不能出门") {
		return "dialogue", miniDialogue(state, "陆沉", "我叫陆沉，法号照尘，只替这里看门、记名。夜里没有必要，不要出门。"), true
	}
	return "story", miniSystem(state, "登记已经完成。可以说‘看看登记簿’，或说‘去斋堂’。"), true
}

func (e *Engine) storyRefectory(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看粥", "看看粥", "查看碗", "闻粥") {
		miniSetFlag(state, "porridge_seen")
		miniClue(state, "斋堂四碗粥表面油花不散，勺底能看见肉纤维；陆沉说僧人不吃，游客可自行选择")
		return "inspect", miniSystem(state, "粥里确实有肉纤维。陆沉说这是照顾远客的供食，僧人自己不吃肉；旁边有素饼和热水。"), true
	}
	if miniHasAny(text, "大家都吃", "全都吃", "让所有人吃", "都喝粥") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "ate")
		}
		return "story", miniDialogue(state, "林岚", "既然大家都吃，我也试一碗。"), true
	}
	if miniHasAny(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "refused")
		}
		return "story", miniDialogue(state, "许栀", "那就先吃素饼。问清楚之前，我不碰这碗粥。"), true
	}
	if miniHasAny(text, "林岚", "周砚", "许栀") {
		person := ""
		switch {
		case strings.Contains(text, "林岚"):
			person = "linlan"
		case strings.Contains(text, "周砚"):
			person = "zhouyan"
		case strings.Contains(text, "许栀"):
			person = "xuzhi"
		}
		choice := "deferred"
		if miniHasAny(text, "不吃", "拒绝", "换素饼", "别吃") {
			choice = "refused"
		} else if miniHasAny(text, "吃", "喝", "尝") {
			choice = "ate"
		}
		miniChooseMeal(state, person, choice)
		return "story", miniMealReply(state, person, choice), true
	}
	if miniHasAny(text, "我不吃", "我拒绝", "我换素饼", "先不喝", "暂缓") {
		miniChooseMeal(state, "player", "refused")
		return "story", miniDialogue(state, "陆沉", "素饼和热水在你手边。饥饿不等于必须喝这碗。"), true
	}
	if miniHasAny(text, "我吃", "我喝", "我尝一口", "吃肉粥") {
		miniChooseMeal(state, "player", "ate")
		return "story", miniDialogue(state, "陆沉", "慢一点喝。粥还热着。"), true
	}
	if miniHasAny(text, "吃完", "晚膳结束", "离开斋堂", "回回廊", "回房") {
		if !state.Flags["meal_player_ate"] && !state.Flags["meal_player_refused"] && !state.Flags["meal_player_deferred"] {
			return "clarify", miniSystem(state, "你还没有决定自己的粥。可以说‘我吃粥’、‘我不吃’或‘暂缓’，再离开斋堂。"), true
		}
		miniSetFlag(state, "meal_done")
		state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
		e.setMiniScene(state, "mini_corridor_candle")
		return "move", miniDialogue(state, "陆沉", "晚膳结束。跟我走回东院，路上每人领一支红烛。"), true
	}
	return "story", miniDialogue(state, "陆沉", "给远客的照顾，僧人自己不吃肉。你可以吃，也可以拿素饼和热水。"), true
}

func miniChooseMeal(state *State, person, choice string) {
	for _, suffix := range []string{"ate", "refused", "deferred"} {
		delete(state.Flags, "meal_"+person+"_"+suffix)
	}
	miniSetFlag(state, "meal_"+person+"_"+choice)
}

func allCompanionsAte(state *State) bool {
	return state.Flags["meal_linlan_ate"] && state.Flags["meal_zhouyan_ate"] && state.Flags["meal_xuzhi_ate"]
}

func miniMealReply(state *State, person, choice string) string {
	var name string
	switch person {
	case "linlan":
		name = "林岚"
	case "zhouyan":
		name = "周砚"
	case "xuzhi":
		name = "许栀"
	default:
		name = "同行者"
	}
	switch choice {
	case "ate":
		return miniDialogue(state, name, "我先尝一点。")
	case "refused":
		return miniDialogue(state, name, "我不吃，给我素饼就好。")
	default:
		return miniDialogue(state, name, "我先不碰，等你问清楚。")
	}
}
