package game

const mealDiscussionAdvance = "自动继续晚膳讨论"

// The keeper's explanation ends at a quiet window. Only the later automatic
// command lets an undecided companion suggest trying the meat porridge.
func (e *Engine) continueMealDiscussion(state *State) string {
	if !state.Flags["refectory_intro_done"] {
		speak := miniSequence(state, "refectory_intro", refectoryLines)
		if state.Flags["refectory_intro_1"] {
			miniSetFlag(state, "meal_guest_explained")
		}
		state.DialogueNext = nextMealDiscussion(state)
		return speak
	}
	if state.Flags["refectory_discussion_done"] {
		state.DialogueNext = "自动结束晚膳"
		return miniDialogue(state, "许栀", "大家慢慢吃，吃完再一起走。")
	}
	for _, line := range []struct{ person, text, shot string }{
		{"linlan", "寺里既然特意准备了，喝一点肉粥应该也没关系吧。", "refectory_table"},
		{"xuzhi", "想吃肉的就吃肉，又没关系，反正是寺庙的人照顾我们。", "refectory_bread"},
	} {
		flag := "refectory_discussion_" + line.person
		if state.Flags[flag] {
			continue
		}
		miniSetFlag(state, flag)
		miniShot(state, line.shot)
		text := line.text
		if state.Flags["meal_"+line.person+"_refused"] {
			text = "行啊，我们还是尊重一下吧，我就不吃肉了。"
		} else if state.Flags["meal_"+line.person+"_deferred"] {
			text = "我还是先把肉粥放着，吃点素菜吧。"
		}
		if line.person == "xuzhi" {
			miniSetFlag(state, "refectory_discussion_done")
		}
		state.DialogueNext = nextMealDiscussion(state)
		return miniDialogue(state, miniPersonName(line.person), text)
	}
	state.DialogueNext = "自动结束晚膳"
	return miniDialogue(state, "许栀", "大家慢慢吃，吃完再一起走。")
}

func nextMealDiscussion(state *State) string {
	if state.Flags["refectory_eating_shown"] {
		return "自动离开斋堂"
	}
	if !state.Flags["refectory_intro_done"] {
		return "继续听"
	}
	if !state.Flags["refectory_discussion_done"] {
		return mealDiscussionAdvance
	}
	return "自动结束晚膳"
}

// mealGroupAdvance is intentionally an automatic dialogue handoff. Each
// participant gets a real Dialogue object, so the voice channel selects that
// participant's profile instead of reading a narrator's combined sentence.
const mealGroupAdvance = "自动离开斋堂"

func (e *Engine) startMealEatingGroup(state *State) string {
	miniShot(state, "refectory_eating")
	miniSetFlag(state, "refectory_eating_shown")
	miniSetFlag(state, "refectory_intro_done")
	miniSetFlag(state, "refectory_discussion_done")
	delete(state.Flags, "refectory_meal_finished")
	// The later route only depends on the four already recorded choices; set
	// these flags before the visible eating beat so a resumed/legacy client
	// cannot lose the meat consequence while the individual lines play.
	state.Flags["meal_all_ate"] = state.Flags["meal_player_ate"] && allCompanionsAte(state)
	state.Flags["skin_double_present"] = state.Flags["meal_player_ate"] || allCompanionsAte(state)
	miniSetFlag(state, "meal_group_pending")
	for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
		delete(state.Flags, "meal_group_spoken_"+person)
	}
	return e.continueMealGroupDialogue(state)
}

func (e *Engine) continueMealGroupDialogue(state *State) string {
	for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
		spoken := "meal_group_spoken_" + person
		if state.Flags[spoken] {
			continue
		}
		miniSetFlag(state, spoken)
		choice := "deferred"
		for _, candidate := range []string{"ate", "refused", "deferred"} {
			if state.Flags["meal_"+person+"_"+candidate] {
				choice = candidate
				break
			}
		}
		// Keep the public handoff compatible with clients that already use
		// the meal closing action. `meal_group_pending` makes the same
		// command advance to the next NPC instead of closing the table.
		state.DialogueNext = "自动离开斋堂"
		if person == "xuzhi" {
			delete(state.Flags, "meal_group_pending")
			state.DialogueNext = "自动离开斋堂"
		}
		return miniDialogue(state, miniPersonName(person), miniMealJudgeReply(person, choice, ""))
	}
	delete(state.Flags, "meal_group_pending")
	state.DialogueNext = "自动离开斋堂"
	return miniDialogue(state, "许栀", "大家按自己的选择吃吧，吃完一起走。")
}
