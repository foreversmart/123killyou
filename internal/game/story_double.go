package game

import "fmt"

var miniScripture = []string{"心不逐声，眼不随影。", "一念既起，归于清明。", "灯在我前。", "门在我后。"}

func (e *Engine) storyDouble(state *State, text string) (string, string, bool) {
	if state.Flags["double_calm"] && (miniContinue(text) || miniHasAny(text, "睡下", "闭眼")) {
		if state.ShotKey != "double_calm" {
			miniShot(state, "double_calm")
			state.DialogueNext = "继续听"
			return "story", miniInner(state, "第四句落下，火焰站稳。同行人慢慢伏在床脚，抓挠声停了。"), true
		}
		return "sleep", e.finishMiniDouble(state, "床脚的同行人安静下来，红烛只剩短短的芯。我终于松开了手。"), true
	}
	if miniHasAny(text, "不吹灭", "坚持点烛", "我不吹") {
		miniSetFlag(state, "double_refused_candle")
		miniShot(state, "double_exit")
		return "story", miniDialogue(state, miniDoubleName(state), "那我出去看看。只看一眼，马上回来。你别一直盯着这支烛。"), true
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
			return "story", miniInner(state, "我记不起完整经文。它抓挠着脸，猛地撞开门冲了出去。我不能跟过去，门闩还在手边。"), true
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
			return "story", miniDialogue(state, miniDoubleName(state), "外面会看见红光的。先把烛吹灭，听我的。"), true
		}
		if state.Flags["double_frenzy"] {
			return "story", e.finishMiniDouble(state, "我没有跟出去，迅速关上房门。门闩扣紧，红烛还亮着。"), true
		}
		miniSetFlag(state, "double_frenzy")
		miniShot(state, "double_frenzy")
		return "story", miniDialogue(state, miniDoubleName(state), "你为什么不信我？你刚才明明叫过我的名字！别拦着我！"), true
	}
	if miniHasAny(text, "出去看看", "出门看看", "跟出去", "离开房间") {
		intent, speak := e.storyDeath(state, "我跟着同行人跨出门槛。走廊尽头的月光变成肉色，门在身后合上了。")
		return intent, speak, true
	}
	miniShot(state, "double_candle")
	return "story", miniDialogue(state, miniDoubleName(state), "别点着，外面的东西看见红光就会进来。把烛吹灭，我们躲一会儿。"), true
}
