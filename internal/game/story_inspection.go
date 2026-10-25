package game

func (e *Engine) storyInspection(state *State, text string) (string, string, bool) {
	var answer, shot string
	switch {
	case miniHasAny(text, "查看铜钥匙", "看看铜钥匙"):
		if state.SceneKey == "mini_register" {
			return "inspect", miniDialogue(state, "陆沉", "钥匙柄上的寺纹已经磨亮了。它只开你自己的门，别拿去试别人的锁。"), true
		}
		answer = "钥匙柄的寺纹被磨得发亮，齿上还带一点旧铜锈。"
	case miniHasAny(text, "听回廊声音", "看看钟楼门"):
		if state.SceneKey != "mini_corridor_candle" {
			return "", "", false
		}
		return "inspect", miniDialogue(state, "陆沉", "钟楼门封着。更锣从廊外传来，门后的金属声偶尔会响，别把它也数进去。"), true
	case miniHasAny(text, "检查门闩", "看看门闩"):
		if state.SceneKey != "mini_room" {
			return "", "", false
		}
		answer = "门闩是整块旧木，推到底会卡住一道深槽。关门时要听清这一声扣紧。"
	case miniHasAny(text, "看引路红烛", "看看长明灯", "检查猫食碟", "检查鸟笼"):
		if state.SceneKey != "mini_oracle" {
			return "", "", false
		}
		if miniHasAny(text, "猫食碟") {
			miniSetFlag(state, "cat_call_heard")
			answer = "猫食碟搁在神公桌边，碟沿粘着几根细毛。刚才廊下那声猫叫还留在耳朵里。"
		} else if miniHasAny(text, "鸟笼") {
			miniSetFlag(state, "bird_call_heard")
			answer = "鸟笼在桌子另一侧，旧羽毛抵着笼条。短鸣从高梁下落下来。"
		} else {
			return "inspect", miniDialogue(state, "神公", "这支烛只替有活路的人引灯。先把问题问清，再掷；长明灯照不到你要回的那扇门。"), true
		}

	case miniHasAny(text, "查看残页", "看残页", "读残页", "入住须知"):
		answer = "纸页末行是‘钟响之后，不要回答自己的名字’。墨迹比别处深，像有人反复描过这几个字。"
	case miniHasAny(text, "看念珠", "查看念珠", "握紧念珠"):
		answer = "念珠里那颗深色木珠温了一点。握紧它，手就不至于一直发抖；它不能替我判断门外是谁。"
	case miniHasAny(text, "看通行凭", "查看通行凭"):
		answer = "暗红印章压在通行凭边角，背面写着‘只许去，不许问’。这不像普通游客须知。"
	case miniHasAny(text, "看相机盖", "检查相机盖", "看铜铃上的"):
		answer, shot = "相机盖还挂在听房门边的铜铃旁。铃一响，就能知道是谁碰了它。", "register_camera_bell"
	case miniHasAny(text, "看修缮图", "查看修缮图", "看折叠修缮"):
		answer, shot = "折叠修缮图压在灯房灯座下。偏殿的位置被旧折痕遮住了一角，像是有人反复展开过。", "register_drag_mark"
	case miniHasAny(text, "看发圈", "查看发圈", "看蓝色发圈"):
		answer, shot = "蓝色发圈夹着入住须知的一角。纸张和发圈一起藏在许栀的房牌后面。", "register_ribbon"
	case miniHasAny(text, "看热水", "查看热水", "看馒头", "查看馒头", "看咸菜", "查看咸菜", "看素菜", "查看素菜", "看本地菜", "看笋干", "看香菇青菜"):
		if state.SceneKey != "mini_refectory" {
			return "", "", false
		}
		answer = "桌中央有一笼热馒头、一碟咸菜，还有本地笋干和香菇青菜。它们都是素的，配热水也够吃一顿晚膳，不必勉强喝那碗粥。"
	case miniHasAny(text, "看施食记", "查看施食记", "看碗签"):
		if state.SceneKey != "mini_refectory" {
			return "", "", false
		}
		miniSetFlag(state, "bowl_tags_seen")
		answer, shot = "施食记残页只剩‘远客’两个字。四只碗签背面各有一道刻痕，周砚的那只最深。", "refectory_porridge"
	case miniHasAny(text, "看油灯", "查看油灯"):
		answer = "油灯还没有点。屋里真正照着门缝的是红烛，我不能把两种火光混在一起。"
	case miniHasAny(text, "为什么五更", "为什么要听是谁"):
		if state.SceneKey == "mini_arrival" {
			return "dialogue", miniDialogue(state, "陆沉", "寺里回声多。知道自己在回答什么，比回答谁更要紧。"), true
		}
		answer = "陆沉说过，寺内用更锣报时。钟、锣、木鱼和回声来自不同地方，不能只把响声一股脑数在一起。"
	default:
		return "", "", false
	}
	if shot != "" && (state.SceneKey == "mini_refectory" || state.SceneKey == "mini_register") {
		miniShot(state, shot)
	}
	return "inspect", miniInner(state, answer), true
}
