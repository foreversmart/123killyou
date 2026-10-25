package game

func (e *Engine) storyFourKnocks(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "你拉开门闩。门外站着一具被剥去后背皮肤的同行人，手已经伸进门内。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "问是谁", "听门") {
		miniSetFlag(state, "four_knocks_survived")
		e.setMiniScene(state, "mini_three_knocks")
		if allCompanionsAte(state) {
			return "story", miniInner(state, "四敲者没有回答。走廊另一端又响起三下敲门；没有可靠的同行者能替我作证。"), true
		}
		return "story", miniDialogue(state, miniCompanionName(state), miniCompanionLine(state)+" 你跟我去看一眼。"), true
	}
	if miniHasAny(text, "检查门缝", "看门眼", "观察门外") {
		return "inspect", miniInner(state, "门缝红蜡完整。门眼里只有月光和空走廊，四敲之后没有脚步，也没有人回答。"), true
	}
	return "story", miniInner(state, "四下敲门后没有回答。先不要开门，先问是谁。"), true
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
	for _, person := range []string{"linlan", "zhouyan", "xuzhi"} {
		if !state.Flags["meal_"+person+"_ate"] {
			return miniPersonName(person)
		}
	}
	return "同行人的声音"
}

func miniCompanionLine(state *State) string {
	switch miniCompanionName(state) {
	case "林岚":
		return "相机盖还在铜铃旁。我从窗户看见住持进了周砚的房。"
	case "周砚":
		return "灯座下的修缮图还在。我看见慧普进了许栀的房。"
	case "许栀":
		return "蓝色发圈还夹着入住须知。我听见门里有人在拖什么。"
	default:
		return "我从窗户看见住持进了同伴的房间。"
	}
}

func (e *Engine) storyThreeKnocks(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "你回应了三敲，却没有先核对门外的人。门外的声音贴着你的名字笑了一声。")
		return intent, speak, true
	}
	if miniHasAny(text, "跟同伴去偷听", "去偷听", "观察住持", "去对应房间") {
		miniSetFlag(state, "companion_present")
		if allCompanionsAte(state) {
			state.Flags["companion_present"] = false
		}
		miniSetFlag(state, "listen_route_started")
		// The cat dish and bird cage are audible landmarks along the wall. The
		// player has heard both before choosing a cover call; replaying one later
		// is therefore an observed sound rather than a random password.
		miniSetFlag(state, "cat_call_heard")
		miniSetFlag(state, "bird_call_heard")
		e.setMiniScene(state, "mini_listen")
		if state.Flags["companion_present"] {
			return "move", miniDialogue(state, miniCompanionName(state), "别踩中间的砖。沿着墙走……你听，半掩的房门里像是皮革被慢慢撕开。"), true
		}
		return "move", miniInner(state, "三敲声把我引到偏房门口。没有真正的同伴在身边，我只能贴墙听见皮革撕裂声，不能相信任何人声。"), true
	}
	if miniHasAny(text, "留在房间", "不出去", "不跟") {
		return "story", miniInner(state, "我留在门房。走廊里传来一声花瓶碰撞，之后所有脚步都停了。"), true
	}
	return "story", miniInner(state, "三敲者说看见住持进了同伴的房间。要跟出去，还是留在红烛旁？"), true
}

func (e *Engine) storyListen(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看猫食碟", "检查猫食碟", "听猫叫") {
		miniSetFlag(state, "cat_call_heard")
		return "inspect", miniInner(state, "猫食碟边缘还有温热的舌痕，回廊里先前那声猫叫就是从这里传出来的。"), true
	}
	if miniHasAny(text, "看鸟笼", "检查鸟笼", "听鸟叫") {
		miniSetFlag(state, "bird_call_heard")
		return "inspect", miniInner(state, "鸟笼里的羽毛轻轻抖动。你记住了那段短促的鸟叫，可以在花瓶声后复述。"), true
	}
	if miniHasAny(text, "猫叫", "学猫", "模仿猫") {
		if !state.Flags["cat_call_heard"] {
			return "clarify", miniInner(state, "我没有先听清猫叫，不能凭空模仿。先检查墙边的猫食碟。"), true
		}
		miniSetFlag(state, "animal_call_passed")
		return "story", e.afterMiniEscape(state, "花瓶碰倒的声音还在回廊里回荡。你模仿猫叫，声音从猫食碟旁传出去；慧普停在门口，转身追向窗台。"), true
	}
	if miniHasAny(text, "鸟叫", "学鸟", "模仿鸟") {
		if !state.Flags["bird_call_heard"] {
			return "clarify", miniInner(state, "我没有先听清鸟叫，不能凭空模仿。先检查墙边的鸟笼。"), true
		}
		miniSetFlag(state, "animal_call_passed")
		return "story", e.afterMiniEscape(state, "花瓶碰倒的声音还在回廊里回荡。你模仿鸟叫，声音从鸟笼旁传出去；慧普停在门口，转身追向窗台。"), true
	}
	if miniHasAny(text, "跑回自己的房间", "跑回房间", "关上房门") {
		if !state.Flags["red_candle_lit"] {
			intent, speak := e.storyDeath(state, "你跑回门房，却发现红烛已经熄灭。黑影沿着门缝追了进来。")
			return intent, speak, true
		}
		if !state.Flags["companion_present"] {
			intent, speak := e.storyDeath(state, "你没有发出猫叫或鸟叫。没有任何声音把慧普引开。")
			return intent, speak, true
		}
		return "story", e.afterMiniEscape(state, "你和同行者冲回门房，关上门，红烛的火焰稳住了门缝里的影子。"), true
	}
	if miniHasAny(text, "跑向大殿", "往大殿跑", "找神公") {
		e.setMiniScene(state, "mini_oracle")
		return "move", miniInner(state, "我沿着长明灯跑过大殿，偏殿里坐着一个还在呼吸的神公。"), true
	}
	if miniHasAny(text, "往其他方向", "跑错", "冲向后山", "去钟楼") {
		intent, speak := e.storyDeath(state, "你跑向另一条黑廊。回声把你的脚步送回慧普身后。")
		return intent, speak, true
	}
	return "story", miniInner(state, "花瓶倒地了。碎片就在脚边，半掩的门里传来撕裂声。现在只能模仿已经听过的猫叫或鸟叫，或者在有同伴时跑回门房并关门。"), true
}

func (e *Engine) afterMiniEscape(state *State, message string) string {
	if state.Flags["skin_double_present"] {
		e.setMiniScene(state, "mini_double")
		return miniInner(state, message+"另一个房门里冲出一个‘同行人’，和我一起躲进来。")
	}
	e.setMiniScene(state, "mini_dawn_trap")
	return miniInner(state, message+"我回到房间，因恐惧再次睡着。")
}

func (e *Engine) finishMiniDouble(state *State, message string) string {
	e.setMiniScene(state, "mini_dawn_trap")
	return miniInner(state, message+"我回到床边，因恐惧再次睡着。")
}

func (e *Engine) storyOracle(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "查看杯筊", "杯筊规矩", "看规矩") {
		return "inspect", miniDialogue(state, "神公", "一平一凸是圣筊，两平是笑筊，两凸是阴筊。正式只问一件事，别替自己多问。"), true
	}
	if miniHasAny(text, "求神公", "救我", "带我回房", "掷杯", "投杯") {
		miniSetFlag(state, "cup_cast_counted")
		if !state.Flags["meal_player_ate"] || state.Flags["animal_call_passed"] {
			miniSetFlag(state, "cup_jiao_rescue")
			return "story", e.afterMiniEscape(state, "杯筊落成一平一凸。神公拿起红烛：‘命不该绝。跟着灯，不要回头。’"), true
		}
		intent, speak := e.storyDeath(state, "杯筊翻成两凸。神公从指尖开始石化，慧普的脚步已经到了大殿门口。")
		return intent, speak, true
	}
	return "story", miniDialogue(state, "神公", "我只让你问一件事。求我救你回房，或先看清杯筊规矩。"), true
}

func (e *Engine) storyDouble(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "不吹灭", "坚持点烛", "我不吹") {
		miniSetFlag(state, "double_refused_candle")
		return "story", miniDialogue(state, "换皮同行人", "那我出去看看。只看一眼，马上回来。"), true
	}
	if miniHasAny(text, "吹灭", "灭烛", "熄灭红烛") {
		intent, speak := e.storyDeath(state, "你吹灭红烛。假同行人的脸贴到黑暗里，门闩随即断了。")
		return intent, speak, true
	}
	if miniHasAny(text, "出去看看", "出门看看", "出去", "跟出去") {
		intent, speak := e.storyDeath(state, "你跟着假同行人走出门。走廊尽头的月光变成肉色，门在身后合上。")
		return intent, speak, true
	}
	if miniHasAny(text, "朗读清心", "念清心", "读清心", "朗读经文") {
		if !state.Flags["mind_script_learned"] {
			miniSetFlag(state, "double_frenzy")
			return "story", miniDialogue(state, "系统", "你记不起完整的经文。假同行人抓挠着脸，突然冲向门外。"), true
		}
		miniSetFlag(state, "double_calm")
		return "story", e.finishMiniDouble(state, "你念完四句清心偈，假同行人的缝线慢慢松开，最后伏在床脚不动了。"), true
	}
	if miniHasAny(text, "关上房门", "不跟出去", "留在房间") {
		if !state.Flags["double_refused_candle"] && !state.Flags["double_frenzy"] {
			return "story", miniSystem(state, "先明确拒绝吹灭红烛，再决定是否让它出门。"), true
		}
		return "story", e.finishMiniDouble(state, "你没有跟出去，迅速关上房门。红烛仍在。"), true
	}
	return "story", miniDialogue(state, "换皮同行人", "别点着，外面的东西看见红光就会进来。把烛吹灭，我们躲一会儿。"), true
}

func (e *Engine) storyDawnTrap(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "算作第六声", "把钟算锣", "以为天亮", "已经天亮", "开门做早课") {
		miniSetFlag(state, "fake_dawn_knocks")
		return "story", miniDialogue(state, "换皮同行人", "（门外敲三下）是我，天亮了。开门一起做早课。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "你打开门。门外的三敲声变成自己的声音，黑影从门缝外涌进来。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "等待真正的五更", "等五更", "等天亮") {
		miniSetFlag(state, "dawn_waited")
		e.setMiniScene(state, "mini_dawn")
		return "move", miniInner(state, "我没有回应三敲。过了一会儿，真正的五声更锣再次传来，鸡鸣和晨光一起出现。"), true
	}
	if miniHasAny(text, "重听", "听钟", "辨认钟声") {
		miniSetFlag(state, "gong_bell_distinguished")
		return "inspect", miniInner(state, "前五声是更锣，最后一声是钟。余响、距离和尾音都不同；我不能把它们混在一起。"), true
	}
	if miniHasAny(text, "回答姓名", "开口回应", "回答门外") {
		intent, speak := e.storyDeath(state, "你回答了门外的声音。它用你的名字回了一遍，门闩自己落下。")
		return intent, speak, true
	}
	return "story", miniInner(state, "五声更锣之后还有一声钟，窗外却仍然很黑。不要开门，等真正的五更。"), true
}

func (e *Engine) storyDawn(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "听天亮对白", "继续听", "听大家说话") {
		switch {
		case !state.Flags["dawn_intro_linlan"]:
			miniSetFlag(state, "dawn_intro_linlan")
			return "story", miniDialogue(state, "林岚", "我昨晚是不是拍到一只猫？照片全黑，只有一圈红光。"), true
		case !state.Flags["dawn_intro_zhouyan"]:
			miniSetFlag(state, "dawn_intro_zhouyan")
			return "story", miniDialogue(state, "周砚", "偏房的门轴比昨晚多了一道新划痕。回去我把平面图画出来。"), true
		case !state.Flags["dawn_intro_xuzhi"]:
			miniSetFlag(state, "dawn_intro_xuzhi")
			return "story", miniDialogue(state, "许栀", "下次散心去海边。寺庙的早课，我听一次就够了。"), true
		default:
			miniSetFlag(state, "dawn_intro_done")
			return "story", miniDialogue(state, "陆沉", "五更后门会开。别回头数灯，也别把昨晚听见的每句话都带走。"), true
		}
	}
	if miniHasAny(text, "坐大巴", "回家", "上车") {
		miniSetFlag(state, "story_finished")
		e.setMiniScene(state, "mini_ending")
		return "ending", miniInner(state, "我和三名同行坐上大巴。车驶离山门，后视镜里‘明照寺’的旧匾闪了一下。"), true
	}
	if miniHasAny(text, "住持去哪", "询问住持", "问住持") {
		return "dialogue", miniDialogue(state, "陆沉", "五更后门会开。别回头数灯，也别把昨晚听见的每句话都带走。"), true
	}
	return "story", miniInner(state, "林岚、周砚、许栀都还在山门。晨光把昨夜的影子压回屋檐下，我们真的活着走出来了。"), true
}

func (e *Engine) storyDeath(state *State, message string) (string, string) {
	miniSetFlag(state, "story_dead")
	state.Effect = Effect{Kind: "glitch", Strength: .8, Duration: 1800}
	e.setMiniScene(state, "mini_death")
	return "death", miniSystem(state, message+" 说‘重新开始’，可以回到灯影寺山门。")

}
