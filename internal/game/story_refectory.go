package game

import "strings"

func (e *Engine) storyRefectory(state *State, text string) (string, string, bool) {
	return e.storyRefectoryWithDecision(state, text, nil)
}

// startMealEating keeps every dinner outcome on the same visible beat. The
// shot gives the table time to show bowls, vegetables, and the characters'
// actions before the keeper leads everyone back to the east courtyard.
func (e *Engine) startMealEating(state *State, speaker, text string) string {
	miniShot(state, "refectory_eating")
	miniSetFlag(state, "refectory_eating_shown")
	miniSetFlag(state, "refectory_intro_done")
	miniSetFlag(state, "refectory_discussion_done")
	delete(state.Flags, "refectory_meal_finished")
	state.DialogueNext = "自动离开斋堂"
	if speaker == "陆沉" || speaker == "" {
		speaker = "许栀"
	}
	return miniDialogue(state, speaker, strings.TrimSpace(text))
}

func (e *Engine) storyRefectoryWithDecision(state *State, text string, judged *MealJudgeResult) (string, string, bool) {
	// Group meal decisions are announced one NPC at a time. Keeping this
	// handoff ahead of the generic eating command prevents one speaker from
	// reading a pasted block of everyone's lines.
	if state.Flags["meal_group_pending"] && (text == mealGroupAdvance || text == "自动离开斋堂") {
		return "story", e.continueMealGroupDialogue(state), true
	}
	// Older clients used the discussion handoff after a group choice. Treat
	// that stale handoff as a request to finish the queued turns and show the
	// existing closing line in the same turn.
	if state.Flags["meal_group_pending"] && text == mealDiscussionAdvance {
		for state.Flags["meal_group_pending"] {
			e.continueMealGroupDialogue(state)
		}
		return e.storyRefectoryWithDecision(state, "自动离开斋堂", nil)
	}
	// A direct action from an older voice client may arrive while the three
	// character turns are queued. Consume the remaining character turns before
	// handing that action to the normal dinner closure, so it cannot strand the
	// player in the refectory. The current client uses mealGroupAdvance above.
	if state.Flags["meal_group_pending"] && (miniHasAny(text, "吃完", "晚膳结束", "离开斋堂", "拿红烛", "领红烛", "回房") || text == mealDiscussionAdvance) {
		for state.Flags["meal_group_pending"] {
			e.continueMealGroupDialogue(state)
		}
	}
	// Voice clients advance the eating beat with 自动离开斋堂. Keep direct
	// command sequences from older clients usable when their next utterance is
	// already an action from the east-courtyard scene.
	if state.Flags["refectory_eating_shown"] && miniHasAny(text, "拿红烛", "领红烛", "回房", "回自己的房间", "点燃红烛", "睡下", "续燃红烛", "不开门", "跟同伴") {
		intent, speak, _ := e.storyRefectoryWithDecision(state, "自动离开斋堂", nil)
		if state.SceneKey == "mini_refectory" {
			// The first automatic handoff is the companion's closing line. A
			// direct next-scene command implies that the short closing beat has
			// already elapsed, so consume the second handoff as well.
			intent, speak, _ = e.storyRefectoryWithDecision(state, "自动离开斋堂", nil)
		}
		// Older direct-command clients used 拿红烛 as the first command after
		// closing dinner. Carry that command into the new corridor scene so the
		// candle is still granted in one turn.
		if miniHasAny(text, "拿红烛", "领红烛") {
			return e.storyCandleCorridor(state, text)
		}
		return intent, speak, true
	}
	if miniContinue(text) || miniHasAny(text, "听晚膳对白") || text == mealDiscussionAdvance {
		if state.Flags["refectory_eating_shown"] {
			return e.storyRefectoryWithDecision(state, "自动离开斋堂", nil)
		}
		return "story", e.continueMealDiscussion(state), true
	}
	if miniHasAny(text, "自动结束晚膳") {
		// Let the table have a visible eating beat when the player simply
		// listens. Explicit choices are preserved; only people still waiting
		// for a decision are settled by the scene's outcome.
		if !state.Flags["refectory_eating_shown"] {
			choiceMade := false
			anyAte := false
			for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
				for _, choice := range []string{"ate", "refused", "deferred"} {
					if state.Flags["meal_"+person+"_"+choice] {
						choiceMade = true
					}
				}
				if state.Flags["meal_"+person+"_ate"] {
					anyAte = true
				}
			}
			if !choiceMade {
				for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
					miniChooseMeal(state, person, "refused")
				}
				miniSetFlag(state, "meal_default_refused")
				state.Flags["meal_all_ate"] = false
				state.Flags["skin_double_present"] = false
				miniShot(state, "refectory_eating")
				miniSetFlag(state, "refectory_eating_shown")
				state.DialogueNext = "自动离开斋堂"
				return "story", e.startMealEating(state, "许栀", "还没想好就先不喝肉粥，吃些馒头和素菜吧。"), true
			}
			if anyAte {
				state.Flags["meal_all_ate"] = state.Flags["meal_player_ate"] && allCompanionsAte(state)
				state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
				miniShot(state, "refectory_eating")
				miniSetFlag(state, "refectory_eating_shown")
				state.DialogueNext = "自动离开斋堂"
				return "story", e.startMealEating(state, "许栀", "有人想吃就慢慢吃，不吃肉粥的就夹些馒头和素菜。大家都照自己的选择来。"), true
			}
			state.Flags["meal_all_ate"] = false
			state.Flags["skin_double_present"] = false
			miniShot(state, "refectory_table")
			miniSetFlag(state, "refectory_eating_shown")
			state.DialogueNext = "自动离开斋堂"
			return "story", e.startMealEating(state, "许栀", "那就都不吃肉粥了，先吃馒头和素菜。等问清楚了，再决定要不要动那几碗。"), true
		}
	}
	if miniHasAny(text, "自动离开斋堂") {
		if !state.Flags["refectory_meal_finished"] {
			miniSetFlag(state, "refectory_meal_finished")
			state.DialogueNext = "自动离开斋堂"
			return "story", miniDialogue(state, "许栀", "吃完了，大家一起走吧。"), true
		}
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
		transition := "大家吃完了。跟我回东院，每人领一支红烛。"
		if state.Flags["meal_player_ate"] || state.Flags["meal_linlan_ate"] || state.Flags["meal_zhouyan_ate"] || state.Flags["meal_xuzhi_ate"] {
			transition = "大家吃完了，各位按自己的选择收好碗。跟我回东院，每人领一支红烛。"
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
	if miniHasAny(text, "问住持", "看帘后", "听帘后") {
		miniShot(state, "refectory_curtain")
		return "dialogue", miniDialogue(state, "慧普", "吃下我的，寺里会记得你。远客难得来一趟，先别拘泥僧人的戒。"), true
	}
	if miniHasAny(text, "为什么会有肉", "为什么有肉", "怎么会有肉", "怎么有肉", "为何有肉", "粥里有肉", "粥里好像有肉", "不是应该吃素", "不是应该都吃素", "和尚不是吃素", "和尚吃肉吗", "僧人吃肉吗", "你们吃肉吗", "谁供的肉", "谁送的肉", "肉从哪里") {
		if state.Flags["meal_guest_explained"] || miniHasAny(text, "谁供的肉", "谁送的肉", "肉从哪里") {
			miniShot(state, "refectory_glance")
			return "inspect", miniObserve(state, "陆沉望向帘后，停了一瞬，又把视线收回来。"), true
		}
		miniSetFlag(state, "meal_guest_explained")
		return "dialogue", miniDialogue(state, "陆沉", miniGuestMealExplanation), true
	}
	if miniHasAny(text, "看粥", "看看粥", "查看碗", "闻粥", "查看粥碗", "看木勺", "搅动粥", "搅动肉粥") {
		miniShot(state, "refectory_porridge")
		miniSetFlag(state, "porridge_seen")
		miniClue(state, "斋堂四碗粥表面油花不散，勺底能看见肉纤维；陆沉说肉食为外来客准备，我们僧人有戒律，是不能吃荤的")
		return "inspect", miniDialogue(state, "周砚", "勺底这一缕像肉丝，已经不是米油了。可碗签还没看清，肉从哪里来，我还说不上。"), true
	}
	if miniExactMealGroup(text, "大家都吃", "全都吃", "让所有人吃", "都喝粥", "大家都喝粥") {
		for _, person := range []string{"player", "linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "ate")
		}
		return "story", e.startMealEatingGroup(state), true
	}
	if judged != nil && len(judged.Decisions) > 0 {
		var replies []string
		firstSpeaker := ""
		group := miniVegetarianGroupRequest(text)
		// A group persuasion is a separate JEV decision for every visible
		// companion. If one answer is missing, keep the player in the discussion
		// instead of silently turning that NPC into a deferred choice.
		if group {
			for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
				if result, ok := judged.Decisions[person]; !ok || normalizeMealDecision(result.Choice) == "" {
					return "clarify", miniSystem(state, "我还没听清每个人的决定。请再说一次，大家要不要尊重寺庙改吃馒头和素菜。"), true
				}
			}
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
			reply := miniMealJudgeReply(person, choice, result.Reply)
			if firstSpeaker == "" {
				firstSpeaker = miniPersonName(person)
			}
			replies = append(replies, miniPersonName(person)+"：“"+reply+"”")
		}
		if len(replies) > 0 {
			speak := strings.Join(replies, " ")
			if group {
				miniChooseGroupPlayerMeal(state, text)
				return "story", e.startMealEatingGroup(state), true
			}
			if state.Flags["meal_player_refused"] {
				return "story", e.startMealEating(state, firstSpeaker, speak), true
			}
			state.DialogueNext = nextMealDiscussion(state)
			return "story", miniDialogue(state, firstSpeaker, speak), true
		}
	}
	if judged != nil {
		return "clarify", miniSystem(state, "这次劝说的意思还不够明确。请直接说明要不要吃肉粥，或告诉对方改吃馒头。"), true
	}
	if miniVegetarianGroupRequest(text) {
		miniChooseGroupPlayerMeal(state, text)
		for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
			miniChooseMeal(state, person, "refused")
		}
		miniSetFlag(state, "persuasion_success")
		// The fallback keeps each companion as an individual dialogue turn.
		// The same sequence is used when JEV returns three separate decisions.
		return "story", e.startMealEatingGroup(state), true
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
			return "dialogue", miniDialogue(state, "周砚", "先等一下。我想看清碗签，来历不清的东西，不能只凭一句‘照顾远客’。"), true
		}
		miniChooseMeal(state, person, choice)
		if choice == "refused" && miniHasAny(text, "劝", "别吃", "不要吃") {
			miniSetFlag(state, "persuasion_success")
		}
		speak := miniMealReply(state, person, choice)
		if person == "player" && choice == "refused" {
			return "story", e.startMealEating(state, state.Dialogue.Speaker, speak), true
		}
		state.DialogueNext = nextMealDiscussion(state)
		return "story", speak, true
	}
	if explicitMeal && choice == "deferred" {
		miniChooseMeal(state, "player", "deferred")
		return "story", miniDialogue(state, "许栀", "那就只吃馒头和素菜吧"), true
	}
	if explicitMeal && choice == "refused" {
		miniChooseMeal(state, "player", "refused")
		return "story", e.startMealEating(state, "许栀", "那就只吃馒头和素菜吧。"), true
	}
	if explicitMeal && choice == "ate" {
		miniChooseMeal(state, "player", "ate")
		return "story", miniDialogue(state, "陆沉", "慢一点，粥还热着，可以先喝喝看。"), true
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
		if !state.Flags["refectory_eating_shown"] {
			return "story", e.startMealEating(state, "许栀", "大家都按自己的选择吃好了。"), true
		}
		if !state.Flags["refectory_meal_finished"] {
			miniSetFlag(state, "refectory_meal_finished")
			return "story", miniDialogue(state, "许栀", "吃完了，大家一起走吧。"), true
		}
		e.setMiniScene(state, "mini_corridor_candle")
		return "move", miniDialogue(state, "陆沉", "吃好了各位，跟我回东院把，路上把红烛给你们。"), true
	}
	return e.storyConversation(state, text)
}
