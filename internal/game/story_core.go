package game

import "strings"

func (e *Engine) story(state *State, text string) (string, string, bool) {
	if !state.StoryMode {
		return "", "", false
	}
	defer e.reconcileStoryDevotion(state)

	if state.Flags["story_dead"] {
		if miniHasAny(text, "重试", "从最近安全", "再试一次") {
			return e.retryMiniStory(state)
		}
		if miniHasAny(text, "重新开始", "重来一遍", "重置这一夜", "再试一次") {
			reset := e.Initial(state.ID)
			*state = reset
			return "reset", miniSystem(state, "第一夜重新开始。你重新站在灯影寺山门前。"), true
		}
		return "dead", miniSystem(state, "这一条路线已经结束。说‘重新开始’，可以从灯影寺山门再来一次。"), true
	}

	if intent, speak, ok := e.storyInspection(state, text); ok {
		return intent, speak, true
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
		return "story", miniSystem(state, "这一夜已经结束。可以查看手记，或说‘重新开始’。"), true
	default:
		return "story", miniSystem(state, "没有确认下一步行动。请说出要调查的物件或要去的地方。"), true
	}
}

func (e *Engine) storyArrival(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "听第一话", "听大家说话", "继续听", "下一句", "下车") {
		return "story", e.arrivalIntro(state), true
	}
	if miniHasAny(text, "看看山门", "观察山门", "看铜铃", "看看花猫", "环顾", "看寺庙", "看佛像", "看正殿", "多看佛像") {
		if miniHasAny(text, "佛像", "正殿") {
			miniSetFlag(state, "gate_seen")
			miniSetFlag(state, "buddha_seen")
			miniShot(state, "arrival_inner")
		} else if miniHasAny(text, "花猫") {
			miniSetFlag(state, "cat_call_heard")
			miniShot(state, "arrival_cat")
		} else {
			miniSetFlag(state, "gate_seen")
			miniShot(state, "arrival_plaque")
		}
		miniClue(state, "山门新匾下露出旧字‘明照寺’，铜铃旁有一只晒太阳的花猫")
		return "inspect", miniObserve(state, "新匾写着灯影寺，侧面旧匾露出‘明照寺’。铜铃静止，花猫抬头望着登记桌。"), true
	}
	if miniHasAny(text, "登记入住", "办理入住", "登记", "报到", "写名字", "放行李", "自动登记入住") {
		miniSetFlag(state, "checked_in")
		e.grantStoryItems(state, "key", "permit", "page", "beads")
		e.setMiniScene(state, "mini_register")
		miniShot(state, "register_key_tags")
		return "move", miniDialogue(state, "陆沉", "四位施主，先把名字写清楚。钥匙只开各自的房，通行凭收好；背面那句‘只许去，不许问’，夜里认路时再看。"), true
	}
	return "story", miniDialogue(state, "陆沉", "登记桌在檐下。想先看山门，还是现在登记？"), true
}

// arrivalIntro presents the first scene's four fixed viewpoints in order. It
// is intentionally a short call-and-response so each speaker and their place
// beside the bus or gate is visible before the player chooses to register.
func (e *Engine) arrivalIntro(state *State) string {
	state.DialogueNext = "继续听"
	switch {
	case !state.Flags["arrival_intro_linlan"]:
		miniSetFlag(state, "arrival_intro_linlan")
		miniShot(state, "arrival_linlan")
		return miniDialogue(state, "林岚", "今天的光真好。等天黑，要是这里还这么安静，我想拍一组灯影。")
	case !state.Flags["arrival_intro_zhouyan"]:
		miniSetFlag(state, "arrival_intro_zhouyan")
		miniShot(state, "arrival_zhouyan")
		return miniDialogue(state, "周砚", "先别急着拍正殿。网页上的照片只拍到前院，我想看看偏房这边的梁是不是后来补过的。")
	case !state.Flags["arrival_intro_xuzhi"]:
		miniSetFlag(state, "arrival_intro_xuzhi")
		miniShot(state, "arrival_xuzhi")
		return miniDialogue(state, "许栀", "我们先把东西放好，再吃饭、睡觉，好吗？今天谁也别临时加探险。")
	case !state.Flags["arrival_intro_luchen"]:
		miniSetFlag(state, "arrival_intro_luchen")
		miniShot(state, "arrival_luchen")
		return miniDialogue(state, "陆沉", "四位施主，行李先放在灯下。名字写清楚，钥匙才好交。夜里若听见钟，先数声，再听它从哪里来。")
	default:
		miniSetFlag(state, "arrival_intro_done")
		miniShot(state, "arrival_inner")
		state.DialogueNext = "自动登记入住"
		return miniInner(state, "别把这份安静当成安全。")
	}
}

func (e *Engine) storyRegister(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "听入住对白") {
		speak := miniSequence(state, "register_intro", registerLines)
		if state.Flags["register_intro_done"] {
			state.DialogueNext = "自动放好行李"
		}
		return "story", speak, true
	}
	if miniHasAny(text, "放好行李", "整理行李", "去各自房间") {
		miniSetFlag(state, "luggage_placed")
		miniShot(state, "register_luggage")
		state.DialogueNext = "自动去斋堂"
		return "story", miniDialogue(state, "许栀", "行李先放到门边吧。残页和念珠留在桌上，红烛等晚膳后再领。"), true
	}
	if miniHasAny(text, "看登记簿", "看看登记", "看房牌", "看残页", "查看通行凭") {
		miniSetFlag(state, "registration_seen")
		miniClue(state, "东院四间偏房分别标为听、灯、纸、门；登记簿边角有被反复划掉的旧名字")
		return "inspect", miniDialogue(state, "周砚", "四把房牌是‘听、灯、纸、门’。这道拖痕从偏殿过来，先看就好，别用手摸。"), true
	}
	if miniHasAny(text, "去斋堂", "去斋房", "去吃饭", "晚膳", "晚饭", "吃晚饭", "自动去斋堂") {
		e.setMiniScene(state, "mini_refectory")
		return "move", miniDialogue(state, "陆沉", "先去斋堂。粥、素饼和热水都在，想吃什么由施主自己决定。"), true
	}
	if miniHasAny(text, "谁是守夜人", "你是谁", "为什么不能出门") {
		return "dialogue", miniDialogue(state, "陆沉", "我叫陆沉，法号照尘，只替这里看门、记名。夜里要出门，先叫我；没有必要，就留在房里。"), true
	}
	return "story", miniDialogue(state, "陆沉", "名字记好了。还有要看的东西，还是先去斋堂？"), true
}

func (e *Engine) storyRefectory(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "听晚膳对白") {
		speak := miniSequence(state, "refectory_intro", refectoryLines)
		if state.Flags["refectory_intro_done"] {
			state.DialogueNext = "自动结束晚膳"
		}
		return "story", speak, true
	}
	if miniHasAny(text, "自动结束晚膳") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			if !state.Flags["meal_"+person+"_ate"] && !state.Flags["meal_"+person+"_refused"] && !state.Flags["meal_"+person+"_deferred"] {
				miniChooseMeal(state, person, "deferred")
			}
		}
		miniSetFlag(state, "meal_done")
		state.Flags["meal_all_ate"] = false
		state.Flags["skin_double_present"] = false
		e.setMiniScene(state, "mini_corridor_candle")
		return "move", miniDialogue(state, "陆沉", "先用素饼和热水垫一垫。晚膳收了跟我回东院，每人领一支红烛。"), true
	}
	if miniHasAny(text, "吃不吃粥", "要不要吃粥") {
		for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
			if miniHasAny(text, miniPersonName(person)) {
				return "dialogue", miniDialogue(state, miniPersonName(person), miniMealQuestion(state, person)), true
			}
		}
	}
	if miniHasAny(text, "谁供的肉", "谁送的肉", "肉从哪里", "问住持", "看帘后", "听帘后") {
		if miniHasAny(text, "问住持", "看帘后", "听帘后") {
			miniShot(state, "refectory_curtain")
			return "dialogue", miniDialogue(state, "慧普", "吃下我的，寺里会记得你。远客难得来一趟，先别拘泥僧人的戒。"), true
		}
		return "dialogue", miniDialogue(state, "陆沉", "供处记在施食簿上。先看你们自己愿不愿意；素饼和热水都够，没人替你们选。"), true
	}
	if miniHasAny(text, "看粥", "看看粥", "查看碗", "闻粥", "查看粥碗", "看木勺", "搅动粥", "搅动肉粥") {
		miniShot(state, "refectory_porridge")
		miniSetFlag(state, "porridge_seen")
		miniClue(state, "斋堂四碗粥表面油花不散，勺底能看见肉纤维；陆沉说僧人不吃，游客可自行选择")
		return "inspect", miniDialogue(state, "周砚", "这里有一缕纤维……不像米油。碗签和施食记还没看清，先别急着下结论。"), true
	}
	if miniHasAny(text, "大家都吃", "全都吃", "让所有人吃", "都喝粥") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "ate")
		}
		return "story", miniDialogue(state, "林岚", "既然大家都吃，我也先尝一口。粥还热着，慢点喝。"), true
	}
	if miniHasAny(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "refused")
		}
		miniSetFlag(state, "persuasion_success")
		return "story", miniDialogue(state, "许栀", "那就先吃素饼。问清楚之前，这碗粥先放着。"), true
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
		if person == "zhouyan" && choice == "ate" && !state.Flags["bowl_tags_seen"] {
			return "dialogue", miniDialogue(state, "周砚", "先等一下。我想看清碗签和施食记，来历不清的东西，不能只凭一句‘照顾远客’。"), true
		}
		miniChooseMeal(state, person, choice)
		if choice == "refused" && miniHasAny(text, "劝", "别吃", "不要吃") {
			miniSetFlag(state, "persuasion_success")
		}
		return "story", miniMealReply(state, person, choice), true
	}
	if miniHasAny(text, "暂缓", "先等等", "我先不喝") {
		miniChooseMeal(state, "player", "deferred")
		return "story", miniDialogue(state, "许栀", "那就把勺放下。先吃素饼，想清楚之前不用勉强自己。"), true
	}
	if miniHasAny(text, "我不吃", "我拒绝", "我换素饼", "先不喝") {
		miniChooseMeal(state, "player", "refused")
		return "story", miniDialogue(state, "陆沉", "素饼和热水在你手边。饿了就先吃这个，不必勉强喝粥。"), true
	}
	if miniHasAny(text, "我吃", "我喝", "我尝一口", "吃肉粥") {
		miniChooseMeal(state, "player", "ate")
		return "story", miniDialogue(state, "陆沉", "慢一点，粥还热着。先尝一口，再决定要不要继续。"), true
	}
	if miniHasAny(text, "吃完", "晚膳结束", "离开斋堂", "回回廊", "回房") {
		if !state.Flags["meal_player_ate"] && !state.Flags["meal_player_refused"] && !state.Flags["meal_player_deferred"] {
			return "clarify", miniDialogue(state, "陆沉", "你的碗还没动。吃、换素饼，还是先放着？想好了，我们再回东院。"), true
		}
		for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
			if !state.Flags["meal_"+person+"_ate"] && !state.Flags["meal_"+person+"_refused"] && !state.Flags["meal_"+person+"_deferred"] {
				miniChooseMeal(state, person, "deferred")
			}
		}
		miniSetFlag(state, "meal_done")
		state.Flags["meal_all_ate"] = state.Flags["meal_player_ate"] && allCompanionsAte(state)
		state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
		e.setMiniScene(state, "mini_corridor_candle")
		return "move", miniDialogue(state, "陆沉", "晚膳收了。跟我回东院，路上每人领一支红烛。"), true
	}
	return "story", miniDialogue(state, "陆沉", "这是给远客的照顾。僧人守自己的戒，客人可以按自己的习惯来；素饼和热水也在手边。"), true
}
