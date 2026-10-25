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
		return "move", miniObserve(state, "门闩扣紧。矮桌上摊着寺史册和薄蓝经书，未点燃的红烛立在桌角，窗外回廊渐暗。"), true
	}
	if miniHasAny(text, "看看房牌", "看偏房", "看走廊", "观察回廊") {
		miniSetFlag(state, "corridor_seen")
		return "inspect", miniDialogue(state, "周砚", "四扇房门依次写着‘听、灯、纸、门’。钟楼门上的锁刚才响了一下，像有人在里面确认时辰。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyRoom(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "点燃红烛", "点红烛", "点烛", "把红烛点上") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniSystem(state, "还没有领取红烛。请先向陆沉拿红烛。"), true
		}
		miniSetFlag(state, "red_candle_lit")
		miniShot(state, "room_candle")
		return "story", miniObserve(state, "火柴擦亮，烛芯随后稳稳燃起。红光照出门闩、寺史册和念珠，床脚仍暗着。"), true
	}
	if miniHasAny(text, "看寺史", "读寺史", "查看历史", "查看寺庙历史", "看历史册", "翻阅寺史") {
		miniSetFlag(state, "history_read")
		miniShot(state, "room_history")
		miniClue(state, "游客版寺史写着顾怀山七年前圆寂成佛，但验身一栏被撕掉")
		return "inspect", miniObserve(state, "游客寺史册摊在‘七年前方丈顾怀山于方丈室圆寂，灯灭即成佛’一页。‘验身’一栏只剩一排整齐的纸齿。"), true
	}
	if miniHasAny(text, "读经", "看经文", "清心静神", "翻开经书", "朗读经文") {
		miniSetFlag(state, "mind_script_learned")
		miniShot(state, "room_scripture")
		miniClue(state, "清心静神经末页：心不逐声，眼不随影；一念既起，归于清明；灯在我前，门在我后")
		return "inspect", miniObserve(state, "薄蓝经书翻到末页。烛光照着四句短偈：心不逐声，眼不随影；一念既起，归于清明；灯在我前，门在我后。"), true
	}
	if miniHasAny(text, "观察窗外", "看看窗外") {
		miniShot(state, "room_window")
		return "inspect", miniObserve(state, "月光沿回廊移到窗纸边，外面的灯线被窗棂切成几段。"), true
	}
	if miniHasAny(text, "看看红烛", "看烛芯", "看蜡泪") {
		miniShot(state, "room_candle_detail")
		return "inspect", miniObserve(state, "烛面上细长的划痕和凝固的蜡泪在近处显露。"), true
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
		return "sleep", miniObserve(state, "烛光淡入黑场。三声沉闷的更锣之后，黑烛芯和凝固蜡泪出现在眼前，门外有湿重的呼吸。"), true
	}
	return e.storyConversation(state, text)
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
		return "story", miniObserve(state, "烛芯重新燃起，门闩上的水痕在红光里显露。拖行声退远，四下敲门先后落在门板上，门眼外只有月光。"), true
	}
	if miniHasAny(text, "看红烛", "看烛芯", "看蜡泪") {
		miniShot(state, "wake_candle_detail")
		return "inspect", miniObserve(state, "烛芯发黑，蜡泪沿烛台凝成黑红色。烛芯上方升起一缕淡烟。"), true
	}
	if miniHasAny(text, "看门外", "听声音") {
		miniShot(state, "wake_door")
		return "inspect", miniObserve(state, "月光落在门闩的水痕上。门外呼吸贴近门板，拖行声停下后，指甲刮过门板。"), true
	}
	if miniHasAny(text, "想一想", "怎么办", "保持冷静") {
		return "story", miniInner(state, "陆沉说过，火不能灭……我得冷静下来。"), true
	}
	return e.storyConversation(state, text)
}
