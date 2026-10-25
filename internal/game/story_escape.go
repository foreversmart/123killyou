package game

func (e *Engine) storyFourKnocks(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "回答姓名", "说出名字", "和门外说话", "与门外对话", "继续和鬼说话") {
		recordGhostDialogue(state)
		miniSetFlag(state, "name_echo_heard")
		if !state.Flags["red_candle_lit"] {
			intent, speak := e.storyDeath(state, "姓名从门外被原样复述。门缝没有红光，影子从缝里挤了进来。")
			return intent, speak, true
		}
		return "story", miniDialogue(state, "你（门外回声）", "是我。你怎么不回答？"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "门闩被拉开。门外同行人的后背没有皮肤，一只手伸进门内。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "问是谁", "听门") {
		if miniHasAny(text, "问是谁") {
			recordGhostDialogue(state)
		}
		miniSetFlag(state, "four_knocks_survived")
		e.setMiniScene(state, "mini_three_knocks")
		if allCompanionsAte(state) {
			miniObserve(state, "四敲后留下一段寂静，轻笑从门后退远。走廊另一端响起三下敲门，没有脚步靠近门前。")
			return "story", miniDialogue(state, miniDoubleName(state)+"（门外）", "跟我来……先跟我来。"), true
		}
		return "story", miniDialogue(state, miniCompanionName(state)+"（门外）", miniCompanionLine(state)+" 先别开门，沿墙走，别惊动里面的人。"), true
	}
	if miniHasAny(text, "检查门缝", "看门眼", "观察门外", "看门闩") {
		miniShot(state, "four_peephole")
		return "inspect", miniObserve(state, "门缝红蜡完整。门眼里只有被月光切开的空走廊，四敲之后没有脚步，没有人影。"), true
	}
	if miniHasAny(text, "听声音", "听敲门") {
		miniShot(state, "four_knocks")
		return "inspect", miniObserve(state, "四下敲门先后落在门板上，间隔相同。余震散去后，门外没有回答。"), true
	}
	if miniHasAny(text, "保持安静") {
		return "inspect", miniObserve(state, "四下敲门的余震已经散去。门外没有回答，呼吸声在门板近处回响。"), true
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
	if miniContinue(text) || miniHasAny(text, "核对身份", "核对门外身份", "确认私物", "问是谁", "和门外说话", "与门外对话", "继续和鬼说话") {
		if miniHasAny(text, "核对身份", "核对门外身份", "确认私物", "问是谁", "和门外说话", "与门外对话", "继续和鬼说话") || miniContinue(text) {
			recordGhostDialogue(state)
		}
		miniSetFlag(state, "companion_checked")
		if miniCompanionID(state) == "" {
			return "story", miniDialogue(state, miniDoubleName(state)+"（门外）", "跟我来……先跟我来。"), true
		}
		return "story", miniDialogue(state, miniCompanionName(state)+"（门外）", miniCompanionLine(state)+" 你先听清楚，再跟我走。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		if !state.Flags["companion_checked"] {
			return "clarify", miniSystem(state, "尚未核对门外身份。请先询问私物细节。"), true
		}
		return "story", miniObserve(state, "房门拉开一条窄缝，手仍压在门闩上。门外衣角只露出一线，回廊其余部分藏在黑暗里。"), true
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
		return "move", miniObserve(state, "视线贴着墙向半掩房门移动。猫食碟旁有短促的猫叫，鸟笼传来短鸣；皮革撕裂声从门里传出。"), true
	}
	if miniHasAny(text, "留在房间", "不出去", "不跟") {
		return "story", miniObserve(state, "红烛照着紧闭的房门。门外脚步移到另一扇门旁停下，没有催促声。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyListen(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看猫食碟", "检查猫食碟", "听猫叫") {
		miniSetFlag(state, "cat_call_heard")
		miniShot(state, "listen_cat")
		return "inspect", miniObserve(state, "猫食碟靠着墙脚，碟沿有几根细毛。短促猫叫从碟旁传来，尾音先低后高。"), true
	}
	if miniHasAny(text, "看鸟笼", "检查鸟笼", "听鸟叫") {
		miniSetFlag(state, "bird_call_heard")
		miniShot(state, "listen_bird")
		return "inspect", miniObserve(state, "鸟笼里的羽毛轻轻抖动。短鸣从笼里传出，沿木梁回响。"), true
	}
	if miniContinue(text) || miniHasAny(text, "观察住持", "观察屋内", "看房内", "看半掩房门", "看剥皮", "靠近门缝") {
		if !state.Flags["skin_seen"] {
			recordSkinWitness(state)
			miniSetFlag(state, "skin_seen")
			miniShot(state, "listen_skin")
			state.DialogueNext = "继续听"
			return "story", miniInner(state, "那不是衣服……我不敢再往前了。"), true
		}
		return e.breakMiniVase(state)
	}
	if miniHasAny(text, "退后", "碰倒花瓶", "检查花瓶", "看碎花瓶") {
		return e.breakMiniVase(state)
	}
	if miniHasAny(text, "猫叫", "学猫", "模仿猫", "鸟叫", "学鸟", "模仿鸟") {
		cat := miniHasAny(text, "猫")
		if (cat && !state.Flags["cat_call_heard"]) || (!cat && !state.Flags["bird_call_heard"]) {
			return "clarify", miniSystem(state, "还没听过这段动物声。请先听清墙边的猫叫或鸟鸣。"), true
		}
		recordSkinWitness(state)
		miniSetFlag(state, "skin_seen")
		miniSetFlag(state, "vase_broken")
		miniSetFlag(state, "animal_call_passed")
		return "story", e.afterMiniEscape(state, "动物声从墙边传出去，慧普转向窗台。视线沿原路退回门房，房门在身后合拢。"), true
	}
	if miniHasAny(text, "跑回自己的房间", "跑回房间", "关上房门") {
		miniSetFlag(state, "vase_broken")
		if !state.Flags["red_candle_lit"] || !state.Flags["companion_present"] {
			intent, speak := e.storyDeath(state, "视线转过墙角，黑影已经截住回门房的路。慧普的脚步紧贴身后。")
			return intent, speak, true
		}
		return "story", e.afterMiniEscape(state, "门房的门猛地关上，门闩扣紧。桌上红烛把追到门缝的影子压了回去。"), true
	}
	if miniHasAny(text, "跑向大殿", "往大殿跑", "找神公") {
		e.setMiniScene(state, "mini_oracle")
		return "move", miniObserve(state, "偏灯在地上拖出窄光，杯筊桌出现在殿侧。身后的脚步由远及近，与穿堂风错开。"), true
	}
	if miniHasAny(text, "往其他方向", "跑错", "冲向后山", "去钟楼", "陌生偏房") {
		intent, speak := e.storyDeath(state, "视线冲入另一条黑廊，回声沿墙折返，慧普的背影再次出现在廊口。")
		return intent, speak, true
	}
	if miniHasAny(text, "听声音", "观察四周", "看地面") {
		return "inspect", miniObserve(state, "手电光压在地面，半掩房门内传来撕裂声。花瓶紧挨鞋跟，地砖中央留着一道拖痕。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) breakMiniVase(state *State) (string, string, bool) {
	recordSkinWitness(state)
	miniSetFlag(state, "skin_seen")
	miniSetFlag(state, "vase_broken")
	miniShot(state, "listen_vase")
	return "story", miniObserve(state, "鞋跟碰到花瓶底。碎瓷滚过地砖，最后一声脆响落地；慧普的念诵骤停，廊灯一起暗下，他的头转向门缝。"), true
}

func (e *Engine) afterMiniEscape(state *State, message string) string {
	if state.Flags["skin_double_present"] {
		e.setMiniScene(state, "mini_double")
		return miniObserve(state, message+"隔壁先响起门闩，一只熟悉的鞋伸进门缝。同行人撞进房间，用肩膀把门合上，影子的边缘断在烛光外。")
	}
	e.setMiniScene(state, "mini_dawn_trap")
	return miniObserve(state, message+"视线落在红烛后淡出。五声更锣之后，远处又响起一声低长的锣，窗纸仍黑着。")
}
func (e *Engine) finishMiniDouble(state *State, message string) string {
	e.setMiniScene(state, "mini_dawn_trap")
	return miniObserve(state, message+"红烛缩成一点，画面淡入黑场。五声更锣之后，远处又响起一声低长的锣，窗纸仍黑着。")
}
