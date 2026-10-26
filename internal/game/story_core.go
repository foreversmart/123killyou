package game

func (e *Engine) story(state *State, text string, decision StoryDecision) (string, string, bool) {
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
			return "reset", miniSystem(state, "第一夜重新开始。你重新站在红烛寺山门前。"), true
		}
		return "dead", miniSystem(state, "这一条路线已经结束。说‘重新开始’，可以从红烛寺山门再来一次。"), true
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
		return e.storyRefectoryWithDecision(state, text, decision.Meal)
	case "mini_corridor_candle":
		return e.storyCandleCorridor(state, text)
	case "mini_room":
		return e.storyRoom(state, text, decision)
	case "mini_wake_three_gongs":
		return e.storyWake(state, text)
	case "mini_four_knocks":
		return e.storyFourKnocks(state, text)
	case "mini_three_knocks":
		return e.storyThreeKnocks(state, text)
	case "mini_listen":
		return e.storyListen(state, text)
	case "mini_oracle":
		return e.storyOracleWithDecision(state, text, decision.Oracle)
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
		return "inspect", miniObserve(state, "新匾写着红烛寺，侧面旧匾露出‘明照寺’。铜铃静止，花猫抬头望着檐下行李。"), true
	}
	if miniHasAny(text, "登记入住", "办理入住", "登记", "报到", "写名字", "放行李", "自动登记入住") {
		e.setMiniScene(state, "mini_register")
		miniShot(state, "register_desk")
		return "move", miniDialogue(state, "陆沉", "登记室的名册已经备好，请各位先把行李放在门边。"), true
	}
	return e.storyConversation(state, text)
}

// arrivalIntro presents the first scene's unload-and-look sequence in order.
// Each line is tied to a visible action: stepping off the bus, taking luggage,
// looking at the gate, and meeting the keeper before registration.
func (e *Engine) arrivalIntro(state *State) string {
	state.DialogueNext = "继续听"
	switch {
	case !state.Flags["arrival_intro_linlan"]:
		miniSetFlag(state, "arrival_intro_linlan")
		miniShot(state, "arrival_unload")
		return miniDialogue(state, "林岚", "坐了这么久的车，腿都麻了……终于到了。先下车活动一下。")
	case !state.Flags["arrival_intro_xuzhi"]:
		miniSetFlag(state, "arrival_intro_xuzhi")
		miniShot(state, "arrival_gate_beauty")
		return miniDialogue(state, "许栀", "这个寺庙好美啊，山门和檐角都好有古典的氛围。")
	case !state.Flags["arrival_intro_weather"]:
		miniSetFlag(state, "arrival_intro_weather")
		miniShot(state, "arrival_weather")
		return miniDialogue(state, "林岚", "今天的天气真好呀。晚上月色应该不错，拍出来的寺庙应该很美。")
	case !state.Flags["arrival_intro_zhouyan"]:
		miniSetFlag(state, "arrival_intro_zhouyan")
		miniShot(state, "arrival_zhouyan")
		return miniDialogue(state, "周砚", "太有意思了，我想把牌匾和屋梁一起研究一下。")
	case !state.Flags["arrival_intro_luchen"]:
		miniSetFlag(state, "arrival_intro_luchen")
		miniSetFlag(state, "arrival_intro_done")
		miniShot(state, "arrival_luchen")
		state.DialogueNext = "自动登记入住"
		return miniDialogue(state, "陆沉", "各位施主可以先参观一下，参观完，大家可以随我去登记室登记房间。")
	default:
		miniSetFlag(state, "arrival_intro_done")
		miniShot(state, "arrival_inner")
		state.DialogueNext = "自动登记入住"
		return miniDialogue(state, "陆沉", "登记室的门已经打开，大家跟紧。")
	}
}

func (e *Engine) storyRegister(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "听入住对白") {
		e.completeMiniRegistration(state)
		speak := miniSequence(state, "register_intro", registerLines)
		if state.Flags["register_intro_done"] {
			state.DialogueNext = "自动放好行李"
		}
		return "story", speak, true
	}
	if miniHasAny(text, "放好行李", "整理行李", "去各自房间") {
		e.completeMiniRegistration(state)
		miniSetFlag(state, "luggage_placed")
		miniShot(state, "register_luggage")
		state.DialogueNext = "自动去斋堂"
		return "story", miniDialogue(state, "许栀", "行李先放到门边吧。念珠留在桌上，红烛等晚膳后再领。"), true
	}
	if miniHasAny(text, "看登记簿", "看看登记", "看房牌", "查看通行凭") {
		miniSetFlag(state, "registration_seen")
		miniClue(state, "东院四间偏房分别标为听、灯、纸、门；登记簿边角有被反复划掉的旧名字")
		return "inspect", miniDialogue(state, "周砚", "四把房牌是‘听、灯、纸、门’。这道拖痕从偏殿过来，先看就好，别用手摸。"), true
	}
	if miniHasAny(text, "去斋堂", "去斋房", "去吃饭", "晚膳", "晚饭", "吃晚饭", "自动去斋堂") {
		e.completeMiniRegistration(state)
		e.setMiniScene(state, "mini_refectory")
		return "move", miniDialogue(state, "陆沉", "请各位随我去斋堂用晚膳。"), true
	}
	if miniHasAny(text, "谁是守夜人", "你是谁", "为什么不能出门") {
		return "dialogue", miniDialogue(state, "陆沉", "我叫陆沉，法号照尘，只替这里看门、记名。夜里要出门，先叫我；没有必要，就留在房里。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) completeMiniRegistration(state *State) {
	if state.Flags["registration_items_given"] {
		return
	}
	miniSetFlag(state, "checked_in")
	miniSetFlag(state, "registration_items_given")
	e.grantStoryItems(state, "key", "permit", "beads")
}
