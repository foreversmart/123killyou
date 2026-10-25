package game

import "strings"

func (e *Engine) story(state *State, text string) (string, string, bool) {
	if !state.StoryMode {
		return "", "", false
	}

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
		return "story", miniInner(state, "这一夜到这里结束了。山门已经看不见，可我还记得旧匾上的字。"), true
	default:
		return "story", miniInner(state, "我还在灯影寺。先看眼前的人和物，再决定往哪走。"), true
	}
}

func (e *Engine) storyArrival(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "听第一话", "听大家说话", "继续听", "下一句", "下车") {
		return "story", e.arrivalIntro(state), true
	}
	if miniHasAny(text, "看看山门", "观察山门", "看铜铃", "看看花猫", "环顾") {
		miniSetFlag(state, "gate_seen")
		if miniHasAny(text, "花猫") {
			miniSetFlag(state, "cat_call_heard")
			miniShot(state, "arrival_cat")
		} else {
			miniShot(state, "arrival_plaque")
		}
		miniClue(state, "山门新匾下露出旧字‘明照寺’，铜铃旁有一只晒太阳的花猫")
		return "inspect", miniInner(state, "新匾写着灯影寺，侧面旧匾还能看见‘明照寺’。山门铜铃没有被风碰响，花猫却一直盯着登记桌。"), true
	}
	if miniHasAny(text, "登记入住", "办理入住", "登记", "报到", "写名字", "放行李", "自动登记入住") {
		miniSetFlag(state, "checked_in")
		e.grantStoryItems(state, "key", "permit", "page", "beads")
		e.setMiniScene(state, "mini_register")
		return "move", miniDialogue(state, "陆沉", "四位施主把名字写在灯下。钥匙只开各自的房，通行凭收好，背面写着‘只许去，不许问’。"), true
	}
	return "story", miniInner(state, "阳光正好，树影却把旧匾切成一段一段。先看看山门，还是先登记入住？"), true
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
		return miniDialogue(state, "林岚", "晴天来古寺，照片肯定好看。要是晚上也这么安静，我就拍一组灯影。")
	case !state.Flags["arrival_intro_zhouyan"]:
		miniSetFlag(state, "arrival_intro_zhouyan")
		miniShot(state, "arrival_zhouyan")
		return miniDialogue(state, "周砚", "先看梁架，再看灯。网页只拍了正殿，没拍偏房。")
	case !state.Flags["arrival_intro_xuzhi"]:
		miniSetFlag(state, "arrival_intro_xuzhi")
		miniShot(state, "arrival_xuzhi")
		return miniDialogue(state, "许栀", "今天只安排吃饭和睡觉，谁也不许临时加探险。")
	case !state.Flags["arrival_intro_luchen"]:
		miniSetFlag(state, "arrival_intro_luchen")
		miniShot(state, "arrival_luchen")
		return miniDialogue(state, "陆沉", "四位施主，行李放在登记桌旁。名字写在灯下，夜里听见钟，先数声，再听是谁。")
	default:
		miniSetFlag(state, "arrival_intro_done")
		miniShot(state, "arrival_inner")
		state.DialogueNext = "自动登记入住"
		return miniInner(state, "车门气阀声慢慢停了。鸟鸣、树叶和远处一声不合时宜的低钟混在一起——先登记入住，别把安静当成安全。")
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
		return "story", miniDialogue(state, "许栀", "行李已经放在各自房里。桌上留下残页和念珠，红烛等晚膳后再领。"), true
	}
	if miniHasAny(text, "看登记簿", "看看登记", "看房牌", "看残页", "查看通行凭") {
		miniSetFlag(state, "registration_seen")
		miniClue(state, "东院四间偏房分别标为听、灯、纸、门；登记簿边角有被反复划掉的旧名字")
		return "inspect", miniDialogue(state, "周砚", "四把房牌分别是‘听、灯、纸、门’。这条拖痕不像普通修缮，先别用手摸。"), true
	}
	if miniHasAny(text, "去斋堂", "去斋房", "去吃饭", "晚膳", "晚饭", "吃晚饭", "自动去斋堂") {
		e.setMiniScene(state, "mini_refectory")
		return "move", miniDialogue(state, "陆沉", "先去斋堂。粥和素饼都在，想吃什么由施主自己决定。"), true
	}
	if miniHasAny(text, "谁是守夜人", "你是谁", "为什么不能出门") {
		return "dialogue", miniDialogue(state, "陆沉", "我叫陆沉，法号照尘，只替这里看门、记名。夜里没有必要，不要出门。"), true
	}
	return "story", miniInner(state, "名字已经写下，登记簿边角那些被划掉的旧名却像还没干。接下来去斋堂。"), true
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
		return "move", miniDialogue(state, "陆沉", "各位施主先用素饼和热水。晚膳收了，跟我回东院，每人领一支红烛。"), true
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
			return "dialogue", miniDialogue(state, "慧普", "吃下我的，寺里会记得你。远客难得来一趟，不必拘泥僧人的戒。"), true
		}
		return "dialogue", miniDialogue(state, "陆沉", "供处记在施食簿上。先看你们自己愿不愿意，素饼和热水都够。"), true
	}
	if miniHasAny(text, "看粥", "看看粥", "查看碗", "闻粥", "查看粥碗", "看木勺", "搅动粥", "搅动肉粥") {
		miniShot(state, "refectory_porridge")
		miniSetFlag(state, "porridge_seen")
		miniClue(state, "斋堂四碗粥表面油花不散，勺底能看见肉纤维；陆沉说僧人不吃，游客可自行选择")
		return "inspect", miniDialogue(state, "周砚", "这不是米油，勺底有肉纤维。陆沉说僧人不吃，游客可以自行选择；素饼和热水在右手边。"), true
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
		if person == "zhouyan" && choice == "ate" && !state.Flags["bowl_tags_seen"] {
			return "dialogue", miniDialogue(state, "周砚", "先等一下。我想看清碗签和施食记，来历不清的东西不能只凭一句照顾游客。"), true
		}
		miniChooseMeal(state, person, choice)
		return "story", miniMealReply(state, person, choice), true
	}
	if miniHasAny(text, "暂缓", "先等等", "我先不喝") {
		miniChooseMeal(state, "player", "deferred")
		return "story", miniDialogue(state, "许栀", "那就把勺放下。先吃素饼，想清楚之前不用勉强自己。"), true
	}
	if miniHasAny(text, "我不吃", "我拒绝", "我换素饼", "先不喝") {
		miniChooseMeal(state, "player", "refused")
		return "story", miniDialogue(state, "陆沉", "素饼和热水在你手边。饥饿不等于必须喝这碗。"), true
	}
	if miniHasAny(text, "我吃", "我喝", "我尝一口", "吃肉粥") {
		miniChooseMeal(state, "player", "ate")
		return "story", miniDialogue(state, "陆沉", "慢一点喝。粥还热着。"), true
	}
	if miniHasAny(text, "吃完", "晚膳结束", "离开斋堂", "回回廊", "回房") {
		if !state.Flags["meal_player_ate"] && !state.Flags["meal_player_refused"] && !state.Flags["meal_player_deferred"] {
			return "clarify", miniDialogue(state, "陆沉", "你这碗还没动。吃、换素饼，还是先放着？想好了，我们再回东院。"), true
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
		return "move", miniDialogue(state, "陆沉", "晚膳结束。跟我走回东院，路上每人领一支红烛。"), true
	}
	return "story", miniDialogue(state, "陆沉", "给远客的照顾，僧人自己不吃肉。你可以吃，也可以拿素饼和热水。"), true
}
