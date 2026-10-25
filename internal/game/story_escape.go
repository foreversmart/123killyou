package game

func (e *Engine) storyFourKnocks(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "回答姓名", "说出名字") {
		miniSetFlag(state, "name_echo_heard")
		if !state.Flags["red_candle_lit"] {
			intent, speak := e.storyDeath(state, "我才说出名字，门外就用一模一样的声音叫回来。没有红烛，门缝里的影子挤了进来。")
			return intent, speak, true
		}
		return "story", miniInner(state, "我的名字刚离开嘴边，门外便用同样的音色慢半拍地复述一遍。残页上的警告是真的；红烛还亮着，我把手从门闩上收回来。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "我拉开门闩。门外是被剥去后背皮肤的同行人，它的手已经伸进门内。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "问是谁", "听门") {
		miniSetFlag(state, "four_knocks_survived")
		e.setMiniScene(state, "mini_three_knocks")
		if allCompanionsAte(state) {
			return "story", miniInner(state, "门外先空了一会儿，随后只留下一声很轻的笑。走廊另一端又响起三下敲门；晚膳时所有人都喝了粥，熟悉的声音也未必可信。"), true
		}
		return "story", miniDialogue(state, miniCompanionName(state)+"（门外）", miniCompanionLine(state)+" 先别开门，沿墙走，别惊动里面的人。"), true
	}
	if miniHasAny(text, "检查门缝", "看门眼", "观察门外", "看门闩") {
		return "inspect", miniInner(state, "门缝红蜡还是完整的。门眼里只有被月光切开的空走廊；四敲之后没有脚步，也没有人回答。"), true
	}
	return e.storyConversation(state, text)
}

func miniPersonName(person string) string {
	switch person {
	case "linlan":
		return "林岚"
	case "zhouyan":
		return "周砚"
	case "xuzhi":
		return "许栀"
	default:
		return "同行者"
	}
}
func miniCompanionName(state *State) string {
	id := miniCompanionID(state)
	if id == "" {
		return "同行人的声音"
	}
	return miniPersonName(id)
}
func miniCompanionLine(state *State) string {
	switch miniCompanionID(state) {
	case "linlan":
		return "相机盖还挂在铜铃旁。我刚才从窗缝看见住持进了周砚的房，里面像是有人在挪东西。"
	case "zhouyan":
		return "灯座下面的修缮图还在，我没拿走。刚才我看见慧普进了许栀的房，门轴响了一下，随后就没声了。"
	case "xuzhi":
		return "我的蓝色发圈还夹着那张残页。我听见门里有拖动声，像重物擦过地板。"
	default:
		return "我从窗户看见住持进了同伴的房间。"
	}
}

func (e *Engine) storyThreeKnocks(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "核对身份", "核对门外身份", "确认私物", "问是谁") {
		miniSetFlag(state, "companion_checked")
		if miniCompanionID(state) == "" {
			return "story", miniInner(state, "门外的声音只会重复‘跟我来’，说不出私物的细节。我不能把它当作同伴。"), true
		}
		return "story", miniDialogue(state, miniCompanionName(state)+"（门外）", miniCompanionLine(state)+" 你先听清楚，再跟我走。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		if !state.Flags["companion_checked"] {
			return "clarify", miniInner(state, "三下敲门只能说明有人声称自己是人。我得先问清私物的细节。"), true
		}
		return "story", miniInner(state, "我只把门拉开一条能看清衣服的缝。先核对声音，再决定是否出去。"), true
	}
	if miniHasAny(text, "跟同伴去偷听", "去偷听", "观察住持", "去对应房间", "独自去看看") {
		state.Flags["companion_present"] = miniCompanionID(state) != ""
		miniSetFlag(state, "listen_route_started")
		miniSetFlag(state, "cat_call_heard")
		miniSetFlag(state, "bird_call_heard")
		e.setMiniScene(state, "mini_listen")
		if state.Flags["companion_present"] {
			return "move", miniDialogue(state, miniCompanionName(state), "别踩中间的砖，沿着墙走……你听，猫食碟那边叫了一声，鸟笼也响了。半掩房门里像是皮革被慢慢撕开。"), true
		}
		return "move", miniInner(state, "我独自贴着墙走。猫食碟旁先叫了一声，鸟笼随后传来短鸣；半掩房门里却是皮革撕裂的声音。"), true
	}
	if miniHasAny(text, "留在房间", "不出去", "不跟") {
		return "story", miniInner(state, "我留在红烛旁。门外的人没有催我，只在另一扇房门边停下脚步，像是在等我先开门。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyListen(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看猫食碟", "检查猫食碟", "听猫叫") {
		miniSetFlag(state, "cat_call_heard")
		return "inspect", miniInner(state, "猫食碟靠着墙脚。刚才那声短促的猫叫从这里传来，尾音先低后高；我把它记住。"), true
	}
	if miniHasAny(text, "看鸟笼", "检查鸟笼", "听鸟叫") {
		miniSetFlag(state, "bird_call_heard")
		return "inspect", miniInner(state, "鸟笼里的羽毛轻轻抖了一下，短鸣沿木梁回了一遍；我把这段声音记住。"), true
	}
	if miniContinue(text) || miniHasAny(text, "观察住持", "观察屋内", "看房内", "看半掩房门", "看剥皮", "靠近门缝") {
		if !state.Flags["skin_seen"] {
			miniSetFlag(state, "skin_seen")
			miniShot(state, "listen_skin")
			state.DialogueNext = "继续听"
			return "story", miniInner(state, "我先看见慧普按住床上人的肩，再看见他的手从那层皮下探进去。那不是衣服，也不是布；它贴着手指回缩，像还记得原来的位置。"), true
		}
		return e.breakMiniVase(state)
	}
	if miniHasAny(text, "退后", "碰倒花瓶", "检查花瓶", "看碎花瓶") {
		return e.breakMiniVase(state)
	}
	if miniHasAny(text, "猫叫", "学猫", "模仿猫", "鸟叫", "学鸟", "模仿鸟") {
		miniSetFlag(state, "skin_seen")
		miniSetFlag(state, "vase_broken")
		cat := miniHasAny(text, "猫")
		if (cat && !state.Flags["cat_call_heard"]) || (!cat && !state.Flags["bird_call_heard"]) {
			return "clarify", miniInner(state, "声音还没有成形。我先把墙边那段猫叫或鸟鸣听清，不能在黑暗里胡乱喊出人声。"), true
		}
		miniSetFlag(state, "animal_call_passed")
		return "story", e.afterMiniEscape(state, "动物声从墙边传出去，盖住了花瓶碎响。慧普转向窗台，我沿着原路退回门房。"), true
	}
	if miniHasAny(text, "跑回自己的房间", "跑回房间", "关上房门") {
		miniSetFlag(state, "vase_broken")
		if !state.Flags["red_candle_lit"] || !state.Flags["companion_present"] {
			intent, speak := e.storyDeath(state, "我没能用声音把慧普引开。刚转过墙角，黑影已经截住回门房的路。")
			return intent, speak, true
		}
		return "story", e.afterMiniEscape(state, "我们冲回门房，关门声落下。桌上红烛把追到门缝的影子压了回去。"), true
	}
	if miniHasAny(text, "跑向大殿", "往大殿跑", "找神公") {
		e.setMiniScene(state, "mini_oracle")
		return "move", miniInner(state, "偏灯在地上拖出一条窄光。我听见身后的脚步，却先分不清那是脚步、风声，还是自己的回声。"), true
	}
	if miniHasAny(text, "往其他方向", "跑错", "冲向后山", "去钟楼", "陌生偏房") {
		intent, speak := e.storyDeath(state, "我跑进另一条黑廊。回声把脚步送回慧普身后，路竟然折回来了。")
		return intent, speak, true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) breakMiniVase(state *State) (string, string, bool) {
	miniSetFlag(state, "skin_seen")
	miniSetFlag(state, "vase_broken")
	miniShot(state, "listen_vase")
	return "story", miniInner(state, "我想把脚收回墙边，鞋跟却先碰到花瓶底。碎瓷滚过地砖，最后一声脆响落地；慧普的念诵停在半个音节，廊灯一起暗了。"), true
}

func (e *Engine) afterMiniEscape(state *State, message string) string {
	if state.Flags["skin_double_present"] {
		e.setMiniScene(state, "mini_double")
		return miniInner(state, message+"隔壁先响起门闩，再有一只熟悉的鞋伸进门缝。同行人撞进房间，用肩膀把门合上。")
	}
	e.setMiniScene(state, "mini_dawn_trap")
	return miniInner(state, message+"我守着红烛再次睡着。醒来时，先响了五声锣；等余震散去，远处又来了一声更长的钟。")
}
func (e *Engine) finishMiniDouble(state *State, message string) string {
	e.setMiniScene(state, "mini_dawn_trap")
	return miniInner(state, message+"我因恐惧睡了过去。五声锣后，远处还有一声更低、更长的钟。")
}
