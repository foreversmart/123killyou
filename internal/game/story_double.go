package game

import "fmt"

var miniScripture = []string{"心不逐声，眼不随影。", "一念既起，归于清明。", "灯在我前。", "门在我后。"}

func (e *Engine) storyDouble(state *State, text string) (string, string, bool) {
	if state.Flags["double_calm"] && (miniContinue(text) || miniHasAny(text, "睡下", "闭眼")) {
		if state.ShotKey != "double_calm" {
			miniShot(state, "double_calm")
			state.DialogueNext = "继续听"
			return "story", miniInner(state, "第四句落下，火焰终于站稳。同行人低下头，慢慢伏到床脚，抓挠声也停了。"), true
		}
		return "sleep", e.finishMiniDouble(state, "床脚的同行人安静下来，红烛只剩短短的芯。我终于松开了手。"), true
	}
	if miniHasAny(text, "不吹灭", "坚持点烛", "我不吹") {
		miniSetFlag(state, "double_refused_candle")
		miniShot(state, "double_exit")
		return "story", miniDialogue(state, miniDoubleName(state), "那我去门外看一眼。只看一眼就回来；你守着火，别跟出来。"), true
	}
	if miniHasAny(text, "吹灭", "灭烛", "熄灭红烛") {
		state.Flags["red_candle_lit"] = false
		intent, speak := e.storyDeath(state, "我吹灭红烛。熟悉的脸在黑暗里贴近，门闩断裂的声音就在耳边。")
		return intent, speak, true
	}
	if miniHasAny(text, "朗读清心", "念清心", "读清心", "朗读经文", "继续念经", "心不逐声", "一念既起", "灯在我前", "门在我后") {
		if !state.Flags["mind_script_learned"] {
			miniSetFlag(state, "double_frenzy")
			miniShot(state, "double_frenzy")
			return "story", miniInner(state, "我记不起完整经文。它先抓挠自己的脸，衣领下露出一小段缝线，随后猛地撞开门冲出去。我不能跟过去，门闩还在手边。"), true
		}
		for index, line := range miniScripture {
			flag := fmt.Sprintf("double_scripture_%d", index+1)
			if !state.Flags[flag] {
				miniSetFlag(state, flag)
				miniShot(state, flag)
				state.DialogueNext = "继续念经"
				if index == len(miniScripture)-1 {
					miniSetFlag(state, "double_calm")
					state.DialogueNext = "继续听"
				}
				return "story", miniDialogue(state, "你·心声", line), true
			}
		}
		return "story", miniInner(state, "四句经文已经念完。它伏在床脚，红烛仍亮着。"), true
	}
	if miniHasAny(text, "不跟出去", "关上房门", "留在房间", "不让它出门") {
		if !state.Flags["double_refused_candle"] && !state.Flags["double_frenzy"] {
			miniShot(state, "double_candle")
			return "story", miniDialogue(state, miniDoubleName(state), "外面的东西会顺着红光找来。先把烛吹灭，我们在黑里等一会儿。"), true
		}
		if state.Flags["double_frenzy"] {
			return "story", e.finishMiniDouble(state, "我没有跟出去，迅速关上房门。门闩扣紧，红烛还亮着。"), true
		}
		miniSetFlag(state, "double_frenzy")
		miniShot(state, "double_frenzy")
		return "story", miniDialogue(state, miniDoubleName(state), "你为什么不信我？刚才在走廊里，你明明叫过我的名字。你忘了吗？"), true
	}
	if miniHasAny(text, "出去看看", "出门看看", "跟出去", "离开房间") {
		intent, speak := e.storyDeath(state, "我跟着同行人跨出门槛。走廊尽头的月光变成肉色，门在身后合上了。")
		return intent, speak, true
	}
	miniShot(state, "double_candle")
	return "story", miniDialogue(state, miniDoubleName(state), "你还点着它？外面的东西会顺着红光找来。先把烛吹灭，我们在黑里等一会儿。"), true
}
