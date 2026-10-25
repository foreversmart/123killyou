package game

import "strings"

func (e *Engine) storyRefectory(state *State, text string) (string, string, bool) {
	return e.storyRefectoryWithDecision(state, text, nil)
}

func (e *Engine) storyRefectoryWithDecision(state *State, text string, judged *MealJudgeResult) (string, string, bool) {
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
		// Automatic closure only settles people who have not answered. Preserve
		// explicit meal choices so eating the porridge still controls the later
		// double route, even when the player asks an unrelated question first.
		state.Flags["meal_all_ate"] = state.Flags["meal_player_ate"] && allCompanionsAte(state)
		state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
		e.setMiniScene(state, "mini_corridor_candle")
		transition := "先用馒头、咸菜和本地素菜垫一垫。晚膳收了跟我回东院，每人领一支红烛。"
		if state.Flags["meal_player_ate"] || state.Flags["meal_linlan_ate"] || state.Flags["meal_zhouyan_ate"] || state.Flags["meal_xuzhi_ate"] {
			transition = "晚膳收了，各位按自己的选择收好碗。跟我回东院，每人领一支红烛。"
		}
		return "move", miniDialogue(state, "陆沉", transition), true
	}
	if miniHasAny(text, "吃不吃粥", "要不要吃粥") {
		for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
			if miniHasAny(text, miniPersonName(person)) {
				return "dialogue", miniDialogue(state, miniPersonName(person), miniMealQuestion(state, person)), true
			}
		}
	}
	if miniHasAny(text, "为什么会有肉", "为什么有肉", "怎么会有肉", "怎么有肉", "为何有肉", "粥里有肉", "粥里好像有肉", "不是应该吃素", "不是应该都吃素", "和尚不是吃素", "和尚吃肉吗", "僧人吃肉吗", "你们吃肉吗") {
		return "dialogue", miniDialogue(state, "陆沉", miniGuestMealExplanation), true
	}
	if miniHasAny(text, "谁供的肉", "谁送的肉", "肉从哪里", "问住持", "看帘后", "听帘后") {
		if miniHasAny(text, "问住持", "看帘后", "听帘后") {
			miniShot(state, "refectory_curtain")
			return "dialogue", miniDialogue(state, "慧普", "吃下我的，寺里会记得你。远客难得来一趟，先别拘泥僧人的戒。"), true
		}
		return "dialogue", miniDialogue(state, "陆沉", "供处记在施食簿上。先看你们自己愿不愿意；馒头、咸菜和本地素菜都够，没人替你们选。"), true
	}
	if miniHasAny(text, "看粥", "看看粥", "查看碗", "闻粥", "查看粥碗", "看木勺", "搅动粥", "搅动肉粥") {
		miniShot(state, "refectory_porridge")
		miniSetFlag(state, "porridge_seen")
		miniClue(state, "斋堂四碗粥表面油花不散，勺底能看见肉纤维；陆沉说僧人不吃，游客可自行选择")
		return "inspect", miniDialogue(state, "周砚", "勺底这一缕像肉丝，已经不是米油了。可碗签和施食记还没看清，肉从哪里来，我还说不上。"), true
	}
	if miniExactMealGroup(text, "大家都吃", "全都吃", "让所有人吃", "都喝粥", "大家都喝粥") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "ate")
		}
		return "story", miniDialogue(state, "林岚", "既然大家都吃，我也先尝一口。粥还热着，慢点喝。"), true
	}
	if judged != nil && len(judged.Decisions) > 0 {
		var replies []string
		firstSpeaker := ""
		if miniExactMealGroup(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃") {
			miniChooseMeal(state, "player", "refused")
		}
		for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
			result, ok := judged.Decisions[person]
			if !ok || result.Choice == "" {
				continue
			}
			choice := normalizeMealDecision(result.Choice)
			if choice == "" {
				continue
			}
			miniChooseMeal(state, person, choice)
			if choice == "refused" {
				miniSetFlag(state, "persuasion_success")
			}
			reply := strings.TrimSpace(result.Reply)
			if reply == "" {
				reply = miniMealReplyText(person, choice)
			}
			if choice == "refused" && !strings.Contains(reply, "不吃肉粥") {
				reply = strings.TrimRight(reply, "。！") + "，我也不吃肉粥了。"
			}
			if firstSpeaker == "" {
				firstSpeaker = miniPersonName(person)
			}
			replies = append(replies, miniPersonName(person)+"：“"+reply+"”")
		}
		if len(replies) > 0 {
			return "story", miniDialogue(state, firstSpeaker, strings.Join(replies, " ")), true
		}
	}
	if judged != nil {
		return "clarify", miniSystem(state, "这次劝说的意思还不够明确。请直接说明要不要吃肉粥，或告诉对方改吃馒头。"), true
	}
	if miniExactMealGroup(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "refused")
		}
		miniSetFlag(state, "persuasion_success")
		return "story", miniDialogue(state, "许栀", "那就先吃素饼。问清楚之前，这碗粥先放着。"), true
	}
	choice, explicitMeal := miniMealChoice(text)
	if explicitMeal && miniHasAny(text, "林岚", "周砚", "许栀") {
		person := ""
		switch {
		case strings.Contains(text, "林岚"):
			person = "linlan"
		case strings.Contains(text, "周砚"):
			person = "zhouyan"
		case strings.Contains(text, "许栀"):
			person = "xuzhi"
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
	if explicitMeal && choice == "deferred" {
		miniChooseMeal(state, "player", "deferred")
		return "story", miniDialogue(state, "许栀", "那就把勺放下。先吃馒头，想清楚之前不用勉强自己。"), true
	}
	if explicitMeal && choice == "refused" {
		miniChooseMeal(state, "player", "refused")
		return "story", miniDialogue(state, "陆沉", "馒头和热水在你手边。饿了就先吃这个，不必勉强喝粥。"), true
	}
	if explicitMeal && choice == "ate" {
		miniChooseMeal(state, "player", "ate")
		return "story", miniDialogue(state, "陆沉", "慢一点，粥还热着。先尝一口，再决定要不要继续。"), true
	}
	if miniHasAny(text, "吃完", "晚膳结束", "离开斋堂", "回回廊", "回房") {
		if !state.Flags["meal_player_ate"] && !state.Flags["meal_player_refused"] && !state.Flags["meal_player_deferred"] {
			return "clarify", miniDialogue(state, "陆沉", "你的碗还没动。吃、换馒头，还是先放着？想好了，我们再回东院。"), true
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
	return e.storyConversation(state, text)
}
