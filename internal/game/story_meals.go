package game

import "strings"

const miniGuestMealExplanation = "寺里本该吃素。这些肉食是特意给外来客备的，怕大家吃不惯寺里的斋饭，照顾一下各人的口味。我们僧人有戒律，是不能吃荤的。"

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
	name := miniPersonName(person)
	replies := map[string]map[string]string{
		"linlan":  {"ate": "你也尝了？那我试一小口。要是太腻，就换馒头。", "refused": "听你的，我也不吃肉粥了。", "deferred": "听你的，我也不吃肉粥了。"},
		"zhouyan": {"ate": "看着挺香，我喝一点，尝尝也无妨。", "refused": "你说得有道理，我也不吃肉粥了。", "deferred": "你说得有道理，我也不吃肉粥了。"},
		"xuzhi":   {"ate": "好，那我也喝一点。", "refused": "那我也不吃肉粥了，换馒头。", "deferred": "那我也不吃肉粥了，换馒头和素材吧感觉也不错。"},
	}
	return miniDialogue(state, name, replies[person][choice])
}

func miniMealReplyText(person, choice string) string {
	replies := map[string]map[string]string{
		"linlan":  {"ate": "你也尝了？那我试一小口。要是太腻，就换馒头。", "refused": "听你的，我也不吃肉粥了。", "deferred": "听你的，我也不吃肉粥了。"},
		"zhouyan": {"ate": "看着挺香，我喝一点，尝尝也无妨", "refused": "你说得有道理，我也不吃肉粥了。", "deferred": "你说得有道理，我也不吃肉粥了。"},
		"xuzhi":   {"ate": "好，那我也喝一点。", "refused": "那我也不吃肉粥了，换馒头。", "deferred": "那我也不吃肉粥了，换馒头和素材吧感觉也不错。"},
	}
	return replies[person][choice]
}

// miniMealJudgeReply turns a JEV decision into one short line spoken by the
// NPC who was actually judged. JEV is allowed to provide a more specific
// reply, but an empty or vague reply must still make the decision audible:
// accepting the persuasion means joining the vegetarian meal, while rejecting
// it means choosing the meat porridge. This keeps a group request from being
// represented by one generic narration line.
func miniMealJudgeReply(person, choice, reply string) string {
	reply = strings.TrimSpace(reply)
	if reply != "" {
		reply = strings.TrimRight(reply, "。！？!? ")
	}
	switch choice {
	case "refused":
		if reply == "" {
			return miniMealVegetarianConsentReply(person)
		}
		if miniHasAny(reply, "我吃了", "我要吃", "喝肉粥", "尝一点肉", "为啥不吃") {
			return miniMealVegetarianConsentReply(person)
		}
		if !miniHasAny(reply, "入乡随俗", "吃素", "素菜", "素材", "馒头", "不吃肉", "不喝肉粥", "尊重") {
			return reply + "。我也不吃肉粥了，还是尊重一下寺庙，入乡随俗吃素好了。"
		}
		if !miniHasAny(reply, "尊重一下", "尊重寺庙") {
			return reply + "，还是尊重一下寺庙，入乡随俗吃素好了。"
		}
		return reply + "。"
	case "ate":
		if reply == "" {
			return miniMealMeatConsentReply(person)
		}
		if miniHasAny(reply, "不吃肉", "不喝肉粥", "吃素", "素菜", "素材", "换馒头", "不碰这碗") {
			return miniMealMeatConsentReply(person)
		}
		if !miniHasAny(reply, "肉", "肉粥", "吃了", "尝", "喝") {
			return reply + "。既然有肉，为啥不吃？我吃了哈。"
		}
		return reply + "。"
	case "deferred":
		if reply == "" {
			return miniMealReplyText(person, choice)
		}
		return reply + "。"
	default:
		return reply
	}
}

func miniMealVegetarianConsentReply(person string) string {
	switch person {
	case "linlan":
		return "好，我们还是尊重一下寺庙，我还是入乡随俗吃素好了，馒头和素菜也可以。"
	case "zhouyan":
		return "好，我们还是尊重一下寺庙的规矩，我还是入乡随俗吃素吧。"
	default:
		return "好，我们还是尊重一下寺庙，我听你的，入乡随俗吃素好了，吃馒头和素菜。"
	}
}

func miniMealMeatConsentReply(person string) string {
	switch person {
	case "linlan":
		return "既然有肉，为啥不吃？我吃了哈。"
	case "zhouyan":
		return "既然特意给了肉粥，我先尝一点，为什么不吃？"
	default:
		return "既然有肉，为啥不吃？我吃了哈。"
	}
}

func normalizeMealDecision(choice string) string {
	switch strings.ToLower(strings.TrimSpace(choice)) {
	case "refused", "refuse", "accepted", "accept", "persuaded", "agree", "同意", "接受", "不吃", "拒绝":
		return "refused"
	case "ate", "eat", "吃", "喝", "同意吃":
		return "ate"
	case "deferred", "defer", "uncertain", "unknown", "暂缓", "犹豫":
		return "deferred"
	default:
		return ""
	}
}

func miniMealQuestion(state *State, person string) string {
	if state.Flags["meal_"+person+"_ate"] {
		return "我已经尝过了。你那碗要不要喝，还是你自己决定。"
	}
	if state.Flags["meal_"+person+"_refused"] {
		return "我已经换馒头了，这碗先留着。"
	}
	switch person {
	case "linlan":
		return "你们都没喝，我也先等等。给我一句准话，我再决定。"
	case "zhouyan":
		return "我先看碗签和供处。问来历，比急着动勺有用。"
	default:
		return "先问清楚吧。要是换馒头，我现在就去拿。"
	}
}
