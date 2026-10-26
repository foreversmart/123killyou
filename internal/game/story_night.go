package game

const (
	delayedDeathAdvance = "自动进入死亡结算"
	sleepAdvance        = "自动进入三更"
)

func (e *Engine) beginDelayedDeath(state *State, shot, message string) (string, string, bool) {
	miniSetFlag(state, "death_pending")
	miniShot(state, shot)
	state.DialogueNext = delayedDeathAdvance
	return "sleep", miniObserve(state, message), true
}

func (e *Engine) finishDelayedDeath(state *State, message string) (string, string, bool) {
	delete(state.Flags, "death_pending")
	state.DialogueNext = ""
	intent, speak := e.storyDeath(state, message)
	return intent, speak, true
}

func (e *Engine) storyCandleCorridor(state *State, text string) (string, string, bool) {
	if miniContinue(text) || miniHasAny(text, "听回廊对白") {
		return "story", miniSequence(state, "corridor_intro", corridorLines), true
	}
	if miniHasAny(text, "拿红烛", "领取红烛", "接过红烛", "给我红烛", "领一支") {
		miniSetFlag(state, "red_candle_held")
		miniShot(state, "corridor_candles")
		e.grantStoryItems(state, "candle")
		return "story", miniDialogue(state, "陆沉", "晚上回房后务必点燃，红烛可以驱除邪祟；经文在桌上，无聊的时候施主们可以看看，定定心神。"), true
	}
	if miniHasAny(text, "回房", "去我的房间", "进门房", "回自己的房", "回偏房") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniDialogue(state, "陆沉", "你的红烛还在这里。拿好，再回自己的房间。"), true
		}
		e.setMiniScene(state, "mini_room")
		return "move", miniObserve(state, "门闩扣紧。矮桌上摊着寺史册和《大念处经》，未点燃的红烛立在桌角，窗外回廊渐暗。"), true
	}
	if miniHasAny(text, "看看房牌", "看偏房", "看走廊", "观察回廊") {
		miniSetFlag(state, "corridor_seen")
		return "inspect", miniDialogue(state, "周砚", "四扇房门依次写着‘听、灯、纸、门’。钟楼门上的锁刚才响了一下，像有人在里面确认时辰。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyRoom(state *State, text string, decision StoryDecision) (string, string, bool) {
	if state.Flags["death_pending"] {
		if text == delayedDeathAdvance {
			return e.finishDelayedDeath(state, "你没有点燃红烛。门外的东西隔着一段时间连续撞门两次，停下半秒后撞开门闩，鬼影冲入房间。")
		}
		state.DialogueNext = delayedDeathAdvance
		return "blocked", miniSystem(state, "过了一会儿，门外的撞击还没有停。先等这一阵声音过去。"), true
	}
	if !roomAmbiguous(text) && miniHasAny(text, "点燃红烛", "点红烛", "点烛", "把红烛点上", "点亮红烛", "点亮烛火", "把烛火点上") {
		return e.lightRoomCandle(state)
	}
	if action, ok := roomExplicitAction(text); ok {
		return e.applyRoomAction(state, action)
	}
	if miniHasAny(text, "观察窗外", "看看窗外") {
		miniShot(state, "room_window")
		return "inspect", miniObserve(state, "月光沿回廊移到窗纸边，外面的灯线被窗棂切成几段。"), true
	}
	// Keep the deterministic aliases for local development and installations
	// without the optional JEV room classifier. When JEV is present, an
	// unmatched utterance must go through it so confidence and ambiguity are
	// handled before any state change.
	if !decision.RoomActionAttempted {
		if action, ok := roomLegacyAction(text); ok {
			return e.applyRoomAction(state, action)
		}
	}
	if decision.RoomAction != nil {
		return e.applyRoomAction(state, decision.RoomAction.Action)
	}
	if decision.RoomActionNeedsClarify {
		return "clarify", miniSystem(state, "我没有听清你要选哪一项。请只说‘看烛火’、‘翻寺史’、‘读经书’或‘躺下歇一会儿’。"), true
	}
	return e.storyConversation(state, text)
}

func roomExplicitCommand(text string) bool {
	if roomAmbiguous(text) {
		return false
	}
	if miniHasAny(text, "点燃红烛", "点红烛", "点烛", "把红烛点上", "点亮红烛", "点亮烛火", "把烛火点上") {
		return true
	}
	if miniHasAny(text, "观察窗外", "看看窗外") {
		return true
	}
	if miniHasAny(text,
		"查看铜钥匙", "看看铜钥匙", "检查门闩", "看看门闩",
		"看念珠", "查看念珠", "握紧念珠", "看通行凭", "查看通行凭", "看油灯", "查看油灯",
		"为什么五更", "为什么要听是谁",
	) {
		return true
	}
	_, ok := roomExplicitAction(text)
	return ok
}

func roomExplicitAction(text string) (RoomAction, bool) {
	if roomAmbiguous(text) {
		return "", false
	}
	switch {
	case miniHasAny(text, "查看寺庙历史"):
		return RoomActionHistory, true
	case miniHasAny(text, "阅读大念处经"):
		return RoomActionScripture, true
	case miniHasAny(text, "看烛芯"):
		return RoomActionCandle, true
	case miniHasAny(text, "睡下"):
		return RoomActionSleep, true
	}
	return "", false
}

func roomLegacyAction(text string) (RoomAction, bool) {
	if roomAmbiguous(text) {
		return "", false
	}
	switch {
	case miniHasAny(text, "看寺史", "读寺史", "查看历史", "看历史册", "翻阅寺史", "寺史", "四史", "史册", "历史书"):
		return RoomActionHistory, true
	case miniHasAny(text, "读经", "看经文", "大念处经", "翻开经书", "朗读经文", "经书", "佛经", "翻经", "四句经文", "观身", "观受", "观心", "观法", "桌上的书", "书页"):
		return RoomActionScripture, true
	case miniHasAny(text, "看看红烛", "看蜡泪", "烛火", "烛光", "烛焰", "灯火", "火苗", "火焰", "蜡烛"):
		return RoomActionCandle, true
	case miniHasAny(text, "睡觉", "入睡", "躺下", "闭眼", "歇一会", "歇会", "歇息", "休息", "睡一觉", "躺一会", "闭目", "床上"):
		return RoomActionSleep, true
	}
	return "", false
}

func roomAmbiguous(text string) bool {
	return miniHasAny(text, "不要", "别", "不想", "不打算", "暂时不", "吗", "为什么", "怎么", "要不要", "是否", "能不能", "如果", "假如")
}

func (e *Engine) applyRoomAction(state *State, action RoomAction) (string, string, bool) {
	switch action {
	case RoomActionCandle:
		return e.inspectRoomCandle(state)
	case RoomActionHistory:
		miniSetFlag(state, "history_read")
		miniShot(state, "room_history")
		miniClue(state, "游客版寺史写着顾怀山七年前圆寂成佛，但验身一栏被撕掉")
		return "inspect", miniObserve(state, "游客寺史册摊在‘七年前方丈顾怀山于方丈室圆寂，灯灭即成佛’一页。‘验身’一栏只剩一排整齐的纸齿。"), true
	case RoomActionScripture:
		miniSetFlag(state, "mind_script_learned")
		miniShot(state, "room_scripture")
		miniClue(state, "大念处经末页：观身如身、观受如受、观心如心、观法如法")
		return "inspect", miniObserve(state, "《大念处经》翻到末页。烛光照着四句经文：观身如身、观受如受、观心如心、观法如法。"), true
	case RoomActionSleep:
		return e.applyRoomSleep(state)
	default:
		return "", "", false
	}
}

func (e *Engine) lightRoomCandle(state *State) (string, string, bool) {
	if !state.Flags["red_candle_held"] {
		return "blocked", miniSystem(state, "还没有领取红烛。请先向陆沉拿红烛。"), true
	}
	miniSetFlag(state, "red_candle_lit")
	miniShot(state, "room_candle")
	return "story", miniObserve(state, "火柴擦亮，烛芯随后稳稳燃起。红光照出门闩、寺史册和念珠，床脚仍暗着。"), true
}

func (e *Engine) inspectRoomCandle(state *State) (string, string, bool) {
	miniShot(state, "room_candle_detail")
	return "inspect", miniObserve(state, "烛面上细长的划痕和凝固的蜡泪在近处显露。"), true
}

func (e *Engine) applyRoomSleep(state *State) (string, string, bool) {
	if !state.Flags["red_candle_lit"] {
		return e.beginDelayedDeath(state, "room_ghost_wait", "过了一会儿，门外有东西猛撞一下。隔了一会儿，第二次撞击震得门闩发响，黑暗里的脚步仍在靠近。")
	}
	miniSetFlag(state, "slept_before_three_gongs")
	miniSetFlag(state, "candle_went_out")
	miniSetFlag(state, "sleep_pending")
	state.Flags["red_candle_lit"] = false
	e.setMiniScene(state, "mini_wake_three_gongs")
	miniShot(state, "room_sleep_wait")
	state.DialogueNext = sleepAdvance
	message := "你躺下歇着。过了好一会儿，烛光才淡入黑场；下一阵更锣还没有响，房内只剩自己的呼吸。"
	// The candle goes out as part of falling asleep, so include this
	// turn's small unlit penalty when deciding whether the threshold is
	// crossed. The actual deduction is settled by story's deferred event
	// reconciliation below.
	projectedDevotion := state.Devotion + DevotionCandleUnlitDelta
	if projectedDevotion < 0 {
		projectedDevotion = 0
	}
	if projectedDevotion <= LowDevotionMonsterThreshold {
		lowDevotionMonsterThreat(state)
		message += "虔诚渐薄，门外不止一个东西；几道沉重的撞击同时落在门板上。"
	}
	return "sleep", miniObserve(state, message), true
}

func (e *Engine) storyWake(state *State, text string) (string, string, bool) {
	if state.Flags["sleep_pending"] {
		if text == sleepAdvance {
			delete(state.Flags, "sleep_pending")
			miniShot(state, "wake_candle")
			state.DialogueNext = ""
			return "sleep", miniObserve(state, "又过了好一会儿，三声沉闷的更锣终于把你惊醒。黑烛芯和凝固的蜡泪出现在眼前，门外传来湿重的呼吸。"), true
		}
		// A direct player action can resolve the waiting handoff early. The
		// normal UI has no choices during this five-second beat, so this is only
		// a voice/backward-compatibility path; the automatic path remains timed.
		delete(state.Flags, "sleep_pending")
		miniShot(state, "wake_candle")
		state.DialogueNext = ""
	}
	if state.Flags["death_pending"] {
		if text == delayedDeathAdvance {
			return e.finishDelayedDeath(state, "红烛已经熄灭。门外的东西隔了一会儿又撞门一次，停下半秒后撞破门闩，鬼影扑进来。")
		}
		state.DialogueNext = delayedDeathAdvance
		return "blocked", miniSystem(state, "过了一会儿，门外的撞门声还在回响。先等着，不要急着开门。"), true
	}
	if miniHasAny(text, "不开烛", "不续燃", "不点", "不用点", "不需要红烛", "算了") {
		return e.beginDelayedDeath(state, "wake_ghost_wait", "红烛熄灭后，过了一会儿，门外有东西重重撞门。隔了一会儿，第二次撞击震动门闩，门外的脚步仍在靠近。")
	}
	if miniHasAny(text, "点燃红烛", "续燃红烛", "重新点燃", "把烛点上", "续烛") {
		state.Flags["red_candle_lit"] = true
		miniSetFlag(state, "candle_relit")
		e.setMiniScene(state, "mini_four_knocks")
		message := "烛芯重新燃起，门闩上的水痕在红光里显露。拖行声退远，四下敲门先后落在门板上，门眼外只有月光。"
		if lowDevotionMonsterThreat(state) {
			message += "门外的撞击没有停，像有更多东西沿着回廊围了上来。"
		}
		return "story", miniObserve(state, message), true
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
