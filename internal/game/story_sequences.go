package game

import "fmt"

type miniLine struct{ speaker, text, shot string }

func miniSequence(state *State, name string, lines []miniLine) string {
	for index, line := range lines {
		flag := fmt.Sprintf("%s_%d", name, index)
		if !state.Flags[flag] {
			miniSetFlag(state, flag)
			miniShot(state, line.shot)
			if name == "corridor_intro" && index == 0 {
				// The second-watch gongs are heard while Lu Chen hands out the
				// red candles. The later warning line keeps its own framing shot
				// without replaying the same sound.
				miniSetFlag(state, "corridor_gongs_played")
			}
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
	{"周砚", "这道拖痕一直从偏殿那边过来，寺庙里为啥有拖痕？", "register_drag_mark"},
	{"陆沉", "这应该是不小心搬柜子的时候留下的，大家不要在意。", "register_drag_mark"},
	{"陆沉", "这是各位的钥匙，请各位施主妥善保管就好了，各位把行李放好我带大家去用晚膳", "register_key_tags"},
}
var refectoryLines = []miniLine{
	{"周砚", "咦这是什么？，这粥里好像有肉啊，寺庙里面平时不是都应该吃素吗？怎么会有肉呢？", "refectory_porridge"},
	{"陆沉", miniGuestMealExplanation, "refectory_lamp"},
}
var corridorLines = []miniLine{
	{"陆沉", "晚上回到房里，必须把红烛点起来。红烛能驱除邪祟，别让火在房里熄了。", "corridor_candles"},
	{"陆沉", "夜里非必要不要出门，免得被不干净的东西缠上。", "corridor_warning"},
	{"林岚", "寺庙里面……还有不干净的东西吗？", "corridor_warning"},
	{"陆沉", "嘘，小声些，不可妄语。要是心里担心、害怕，就多读几页经书，经书能让人定定心神。", "corridor_warning"},
	{"陆沉", "寺里的规矩，夜里会打更，每个时辰打对应锣声数，比如说两根就打两次锣声，千万别把回声和风声混在一起听错了。", "corridor_lock"},
	{"陆沉", "各位施主，二更天到了，请各位早些休息吧。五更天我们会起来做早课，有空的话，可以前来观摩。", "corridor_two_gongs"},
}
var dawnLines = []miniLine{
	{"林岚", "相机还在，可惜拍的照片全是黑的，只剩一圈红光……等等回到车上我再看看。", "dawn_courtyard"},
	{"周砚", "这里怎么出现了一道道痕，昨天没有啊，好奇怪。", "dawn_axis"},
	{"许栀", "下次散心去海边吧。寺庙的早课，我听一次就够了，真的。", "dawn_gate"},
}
