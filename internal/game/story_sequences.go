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
	{"周砚", "等一下，粥里好像有肉。斋堂平日吃素，大家想不想吃这一碗？先问问彼此，再动勺子。", "refectory_porridge"},
	{"陆沉", miniGuestMealExplanation + "我站在门边，不替各位决定。", "refectory_lamp"},
	{"林岚", "我有点想尝，但又不想只凭香味做决定。你可以分别问问我们，谁愿意吃、谁想换馒头。", "refectory_table"},
	{"许栀", "馒头、咸菜和笋干都在手边。想吃肉粥就说一声，不想吃也没关系，先把自己的想法问清楚。", "refectory_bread"},
}
var corridorLines = []miniLine{
	{"陆沉", "晚膳后跟我回房。路上每人一支红烛，晚上回到房里必须点燃，红烛可以驱除邪祟，别让火在房里熄了。", "corridor_candles"},
	{"陆沉", "夜里非必要不要出门，免得被不干净的东西缠上。", "corridor_warning"},
	{"林岚", "寺庙里面……还有不干净的地方吗？", "corridor_warning"},
	{"陆沉", "嘘，小声些，别让声音传远。要是心里担心、害怕，就多读几页经书，经书能让人定定心神。", "corridor_warning"},
	{"周砚", "五更天的时候，你们会起来做早课吗？如果有空，我们可以来观摩吗？", "corridor_lamp"},
	{"陆沉", "按寺里的时辰，五更天才接近天亮。报时只数更锣，风声和回声都别混在一起。", "corridor_lock"},
	{"陆沉", "各位施主，两更天到了，请各位早些休息吧。五更天我们会起来做早课，有空的话，可以前来观摩。", "corridor_two_gongs"},
}
var dawnLines = []miniLine{
	{"林岚", "它还在。昨晚我是不是拍到一只猫？照片全黑，只剩一圈红光……回车上我再看。", "dawn_courtyard"},
	{"周砚", "这道痕昨晚没有。先不碰，回去我把平面图画出来，再对照门的方向。", "dawn_axis"},
	{"许栀", "下次散心去海边吧。寺庙的早课，我听一次就够了，真的。", "dawn_gate"},
	{"陆沉", "五更后门会开。下山时别回头数灯，也别把昨晚听见的每句话都带走。", "dawn_gate"},
}
