package game

import "fmt"

type miniLine struct{ speaker, text, shot string }

func miniSequence(state *State, name string, lines []miniLine) string {
	for index, line := range lines {
		flag := fmt.Sprintf("%s_%d", name, index)
		if !state.Flags[flag] {
			miniSetFlag(state, flag)
			miniShot(state, line.shot)
			if index == len(lines)-1 {
				miniSetFlag(state, name+"_done")
				state.DialogueNext = ""
			} else {
				state.DialogueNext = "继续听"
			}
			return miniDialogue(state, line.speaker, line.text)
		}
	}
	return miniSystem(state, "这一段对白已经结束。请说出下一步行动，或重听当前对白。")
}

func miniContinue(text string) bool {
	switch text {
	case "继续听", "下一句", "听大家说话", "听他们", "继续对话":
		return true
	default:
		return false
	}
}

var registerLines = []miniLine{
	{"周砚", "这道痕从偏殿那边过来，像是修缮时留下的？", "register_drag_mark"},
	{"陆沉", "看见就好，别用手摸。晚膳后我带你们走一遍，白天认过路，晚上才不会绕错。", "register_drag_mark"},
	{"林岚", "‘听’房……名字倒挺特别。这个铃要是响了，会不会把声音也录进去？", "register_camera_bell"},
	{"许栀", "蓝色发圈夹着入住须知，四块房牌我也都看清了。", "register_ribbon"},
	{"陆沉", "这是各位的钥匙，请各位施主妥善保管就好了。房牌都对应好了，行李可以放到各自门边。", "register_key_tags"},
}
var refectoryLines = []miniLine{
	{"周砚", "等一下，粥里好像有肉！和尚庙不是应该都吃素吗，为什么会有肉？", "refectory_porridge"},
	{"陆沉", miniGuestMealExplanation, "refectory_lamp"},
	{"林岚", "听起来像是好意。不过，好意也该先问清楚。", "refectory_table"},
	{"许栀", "先拿个馒头，再夹点咸菜和笋干。粥里的肉是谁送来的，等问明白了再决定。", "refectory_bread"},
}
var corridorLines = []miniLine{
	{"林岚", "寺里……真的有需要防的东西？", "corridor_candles"},
	{"陆沉", "嘘，别让声音走远。经文在桌上，心先定下来，脚下才不会乱。", "corridor_warning"},
	{"周砚", "你说三更以前别出门，那五更就是天亮、做早课的时候？", "corridor_lamp"},
	{"陆沉", "按寺里的时辰，五更才接近天亮。只数更锣，风声、钟声和回声，都别混在一起。", "corridor_lock"},
	{"陆沉", "二更到了。各位施主，先把门关好，早些休息。", "corridor_two_gongs"},
}
var dawnLines = []miniLine{
	{"林岚", "它还在。昨晚我是不是拍到一只猫？照片全黑，只剩一圈红光……回车上我再看。", "dawn_courtyard"},
	{"周砚", "这道痕昨晚没有。先不碰，回去我把平面图画出来，再对照门的方向。", "dawn_axis"},
	{"许栀", "下次散心去海边吧。寺庙的早课，我听一次就够了，真的。", "dawn_gate"},
	{"陆沉", "五更后门会开。下山时别回头数灯，也别把昨晚听见的每句话都带走。", "dawn_gate"},
}
