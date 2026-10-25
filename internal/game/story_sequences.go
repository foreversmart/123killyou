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
	return miniInner(state, "我把刚才的话记住了。先看清眼前，再决定下一步。")
}

func miniContinue(text string) bool {
	return miniHasAny(text, "继续听", "下一句", "听大家说话", "听他们", "继续对话")
}

var registerLines = []miniLine{
	{"周砚", "这条拖痕是修缮留下的？从东院一直拖到偏殿门口。", "register_rooms"},
	{"陆沉", "旧东西，别用手摸。晚膳后我带你们认路。", "register_rooms"},
	{"林岚", "听房的名字挺特别。相机盖先挂在这枚铜铃上，铃响会不会自动录音？", "register_rooms"},
	{"许栀", "我把蓝色发圈夹在入住须知里。如果晚上想喝水，叫人还是自己去？", "register_rooms"},
	{"陆沉", "先叫我。没有必要，不要出门。行李放妥了，我们去斋堂。", "register_luggage"},
}
var refectoryLines = []miniLine{
	{"周砚", "这不是米油，勺底有纤维。你看，肉丝挂在勺边。", "refectory_porridge"},
	{"陆沉", "给远客的照顾。僧人自己不吃肉，客人不必守我们的戒。", "refectory_porridge"},
	{"林岚", "寺里连粥都讲究，听着不像坏事。不过，你还没喝，我也先等等。", "refectory_table"},
	{"许栀", "先别急着喝，问清楚再决定。素饼还热着，不会饿着。", "refectory_table"},
	{"慧普", "吃下我的，寺里会记得你。远客难得来一趟，不必拘泥。", "refectory_curtain"},
}
var corridorLines = []miniLine{
	{"林岚", "寺里也有脏东西？我还以为，山门里最清净呢。", "corridor_warning"},
	{"陆沉", "嘘。小声。经文在桌上，心定了，脚下才不乱。", "corridor_warning"},
	{"周砚", "五更天亮？这更锣和山下的声音不太一样。", "corridor_warning"},
	{"陆沉", "五更天亮，我们做早课。听见一更一更的锣，不要把别的声音算进去。", "corridor_warning"},
	{"陆沉", "二更。各位施主早些休息，关门后把红烛点起来。", "corridor_two_gongs"},
}
var dawnLines = []miniLine{
	{"林岚", "我昨晚是不是拍到一只猫？照片全黑，只有一圈红光。", "dawn_courtyard"},
	{"周砚", "偏房的门轴比昨晚多了一道新划痕。回去我把平面图画出来。", "dawn_courtyard"},
	{"许栀", "下次散心去海边。寺庙的早课，我听一次就够了。", "dawn_gate"},
	{"陆沉", "五更后门会开。别回头数灯，也别把昨晚听见的每句话都带走。通行凭交给我吧。", "dawn_gate"},
}
