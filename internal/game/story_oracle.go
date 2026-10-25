package game

import "math/rand/v2"

func (e *Engine) storyOracle(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "跟神公回房", "跟着灯回房") {
		switch state.ShotKey {
		case "oracle_cast":
			if state.Flags["cup_roll_sacred"] {
				miniSetFlag(state, "cup_jiao_rescue")
				miniShot(state, "oracle_rescue")
				state.DialogueNext = "继续听"
				return "story", miniDialogue(state, "神公", "命不该绝。跟着这点灯光回去，别回头。"), true
			}
			miniSetFlag(state, "cup_failed")
			miniShot(state, "oracle_stone")
			state.DialogueNext = "继续听"
			return "story", miniObserve(state, "两片杯面朝向相同的一侧。神公低头看指尖，灰色沿手背爬上衣领，身后佛像显出相同的脸。殿外脚步又近了一步。"), true
		case "oracle_rescue":
			state.Flags["red_candle_lit"] = true
			return "move", e.afterMiniEscape(state, "引路红烛沿回廊移向门房。房内红烛重新站稳，门闩落下。"), true
		case "oracle_stone":
			intent, speak := e.storyDeath(state, "神公化成佛像，引路红烛熄灭。慧普的脚步停在身后。")
			return intent, speak, true
		default:
			miniShot(state, "oracle_rules")
			return "story", miniDialogue(state, "神公", "一平一凸是圣筊，两平是笑筊，两凸是阴筊。圣筊，我替你引灯；另外两种，只说明这条路今天不肯让你走。想好一件事，再掷。"), true
		}
	}
	if miniHasAny(text, "查看杯筊", "杯筊规矩", "看规矩", "看鸟笼", "看猫食碟") {
		miniSetFlag(state, "oracle_rules_seen")
		miniShot(state, "oracle_rules")
		return "inspect", miniDialogue(state, "神公", "一平一凸是圣筊，两平是笑筊，两凸是阴筊。你只问回自己房间这一件事，别临时改口。"), true
	}
	if miniHasAny(text, "掷杯", "投杯", "掷筊") {
		if !state.Flags["oracle_question"] {
			return "clarify", miniDialogue(state, "神公", "先把所求说清。你要回门房，就只问这一件事；问题还没定，别急着掷。"), true
		}
		if state.Flags["cup_cast_counted"] {
			return "story", miniDialogue(state, "神公", "这一投已经落下。先看清杯面，今天不能再掷。"), true
		}
		miniSetFlag(state, "cup_cast_counted")
		miniSetFlag(state, "oracle_question")
		roll := rand.IntN(100)
		if e.storyRoll != nil {
			roll = e.storyRoll()
		}
		threshold := 70
		if state.Flags["meal_player_ate"] {
			threshold = 35
		}
		if roll < threshold {
			miniSetFlag(state, "cup_roll_sacred")
		} else if roll%2 == 0 {
			miniSetFlag(state, "cup_roll_laugh")
		} else {
			miniSetFlag(state, "cup_roll_dark")
		}
		miniShot(state, "oracle_cast")
		state.DialogueNext = "继续听"
		return "story", miniObserve(state, "两片杯筊离开手心，在灯下翻转，先后落到地砖上。神公低头看着杯面。"), true
	}
	if miniHasAny(text, "求神公", "救我", "带我回房", "我想回自己的房间", "确认求回门房") {
		miniSetFlag(state, "oracle_question")
		miniShot(state, "oracle_question")
		return "story", miniDialogue(state, "神公", "我听清了，你只求回自己的房间。封条已经解开；把这一问定住，再把杯筊掷下去。"), true
	}
	return "story", miniDialogue(state, "神公", "慧普的脚步还没到这里。先想清你求的是什么，我不会替你掷。"), true
}
