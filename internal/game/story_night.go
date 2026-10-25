package game

func (e *Engine) storyCandleCorridor(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "听回廊对白") {
		return "story", miniSequence(state, "corridor_intro", corridorLines), true
	}
	if miniHasAny(text, "拿红烛", "领取红烛", "接过红烛", "给我红烛", "领一支") {
		miniSetFlag(state, "red_candle_held")
		miniShot(state, "corridor_candles")
		e.grantStoryItems(state, "candle")
		return "story", miniDialogue(state, "陆沉", "火不能灭。三更以前先留在房里，红烛守住的是你自己的影子。经文在桌上，心先定下来，脚下才不会乱。"), true
	}
	if miniHasAny(text, "回房", "去我的房间", "进门房", "回自己的房", "回偏房") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniDialogue(state, "陆沉", "你的红烛还在这里。拿稳，再回自己的房间。"), true
		}
		e.setMiniScene(state, "mini_room")
		return "move", miniInner(state, "我回到写着‘门’的偏房。关门声落下，桌上是寺史册和《清心静神经》，红烛还没有点。"), true
	}
	if miniHasAny(text, "看看房牌", "看偏房", "看走廊", "观察回廊") {
		miniSetFlag(state, "corridor_seen")
		return "inspect", miniDialogue(state, "周砚", "四扇房门依次写着‘听、灯、纸、门’。钟楼门上的锁刚才响了一下，像有人在里面确认时辰。"), true
	}
	return "story", miniDialogue(state, "陆沉", "二更到了。各位施主，先把门关好，早些休息；五更才接近天亮。"), true
}

func (e *Engine) storyRoom(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "点燃红烛", "点红烛", "点烛", "把红烛点上") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniInner(state, "我没有把红烛拿回来。它还在陆沉手里，这盏油灯替不了它。"), true
		}
		miniSetFlag(state, "red_candle_lit")
		miniShot(state, "room_candle")
		return "story", miniInner(state, "火柴先照亮桌角的寺史册，烛芯随后稳稳立住。红烛只照清眼前这一小块地方，不会替我认出门外的人。"), true
	}
	if miniHasAny(text, "看寺史", "读寺史", "查看历史", "查看寺庙历史", "看历史册", "翻阅寺史") {
		miniSetFlag(state, "history_read")
		miniShot(state, "room_history")
		miniClue(state, "游客版寺史写着顾怀山七年前圆寂成佛，但验身一栏被撕掉")
		return "inspect", miniInner(state, "寺史册写着‘七年前方丈顾怀山于方丈室圆寂，灯灭即成佛’。页角的验身一栏被整齐撕走，像有人不想让游客看见。"), true
	}
	if miniHasAny(text, "读经", "看经文", "清心静神", "翻开经书", "朗读经文") {
		miniSetFlag(state, "mind_script_learned")
		miniShot(state, "room_scripture")
		miniClue(state, "清心静神经末页：心不逐声，眼不随影；一念既起，归于清明；灯在我前，门在我后")
		return "inspect", miniInner(state, "薄蓝封皮翻到末页，四句短偈一行行落在烛光里。我把它们记在心里，等真正需要时再念。"), true
	}
	if miniHasAny(text, "看看红烛", "看烛芯", "看蜡泪", "观察窗外", "看看窗外") {
		return "inspect", miniInner(state, "烛面有指甲般的划痕。过了一会儿，月光沿着回廊移到窗纸边，外面的灯线被切成一段一段。"), true
	}
	if miniHasAny(text, "睡觉", "睡下", "入睡", "躺下", "闭眼") {
		if !state.Flags["red_candle_lit"] {
			intent, speak := e.storyDeath(state, "你没有点燃红烛就睡下。三声更锣后，黑影沿着没有烛光的门缝撞进来。")
			return intent, speak, true
		}
		miniSetFlag(state, "slept_before_three_gongs")
		miniSetFlag(state, "candle_went_out")
		state.Flags["red_candle_lit"] = false
		e.setMiniScene(state, "mini_wake_three_gongs")
		return "sleep", miniInner(state, "更锣一声远、一声近。烛火在眼皮后轻轻晃，我还是睡着了。过了不知多久，三声沉闷的锣把我惊醒。"), true
	}
	return "story", miniInner(state, "门闩在身后，红烛在桌上。先把烛火点稳，再看看桌上的两本书。"), true
}

func (e *Engine) storyWake(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "不开烛", "不续燃", "不点", "不用点", "不需要红烛", "算了") {
		intent, speak := e.storyDeath(state, "你决定不续燃红烛。门板外的人形鼓起，黑影撞开了房门。")
		return intent, speak, true
	}
	if miniHasAny(text, "点燃红烛", "续燃红烛", "重新点燃", "把烛点上", "续烛") {
		state.Flags["red_candle_lit"] = true
		miniSetFlag(state, "candle_relit")
		e.setMiniScene(state, "mini_four_knocks")
		return "story", miniInner(state, "火光先照出门闩上的水痕，烛芯才重新立起。拖行声退到廊尾，四下敲门却跟着月光到了门前；我不能急着开门。"), true
	}
	if miniHasAny(text, "看红烛", "看烛芯", "看门外", "听声音") {
		return "inspect", miniInner(state, "烛芯已经黑了，蜡泪沿烛台凝成黑红色。门外的呼吸贴近门板，拖行声停下后，才响起一声指甲刮门。"), true
	}
	return "story", miniInner(state, "我记得陆沉说过，火不能灭。先看烛芯，再听门外，别急着碰门闩。"), true
}
