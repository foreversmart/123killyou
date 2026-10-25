package game

import "strings"

const miniGuestMealExplanation = "寺里本该吃素。这些肉食是特意给外来客备的，怕大家吃不惯寺里的斋饭，照顾一下各人的口味。我们僧人自己不吃肉。馒头、咸菜和本地素菜也都有，不想喝粥就吃那些。"

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
		"linlan":  {"ate": "你也尝了？那我试一小口。要是太腻，就换馒头。", "refused": "听你的，先不喝。照片可以晚点拍，肚子可不能拿来冒险。", "deferred": "你们先问，我把勺放下，拍张碗签再说。"},
		"zhouyan": {"ate": "碗签我看过了。我记着它的刻痕，只尝这一点。", "refused": "先查来历是对的。施食记缺了供处，我不碰这碗。", "deferred": "让我先看看碗签。没有来历，不能只听住持一句话。"},
		"xuzhi":   {"ate": "好，我喝一点。你们要是想换馒头，我帮着拿。", "refused": "那就换馒头。问清楚之前，我不想碰这碗粥。", "deferred": "我先不碰，给你留一个馒头。别为了客气勉强自己。"},
	}
	return miniDialogue(state, name, replies[person][choice])
}

func miniMealReplyText(person, choice string) string {
	replies := map[string]map[string]string{
		"linlan":  {"ate": "那我也尝一小口。", "refused": "听你的，我也不吃肉粥了。", "deferred": "我也先不碰，等问清楚再说。"},
		"zhouyan": {"ate": "我也只尝一点，先记下碗签。", "refused": "你说得有道理，我也不吃肉粥了。", "deferred": "我也先放下，先查清楚来历。"},
		"xuzhi":   {"ate": "好，那我也喝一点。", "refused": "那我也不吃肉粥了，换馒头。", "deferred": "我也先不碰，给大家拿馒头。"},
	}
	return replies[person][choice]
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
