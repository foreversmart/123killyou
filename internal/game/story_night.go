package game

func (e *Engine) storyCandleCorridor(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "拿红烛", "领取红烛", "接过红烛", "给我红烛", "领一支") {
		miniSetFlag(state, "red_candle_held")
		return "story", miniDialogue(state, "陆沉", "火不能灭。红烛守住的是你自己的影子。三更以前别出门，经文在桌上，心定了脚下才不乱。"), true
	}
	if miniHasAny(text, "回房", "去我的房间", "进门房", "回自己的房", "回偏房") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniSystem(state, "陆沉还没有把红烛交给你。先说‘拿红烛’。"), true
		}
		e.setMiniScene(state, "mini_room")
		return "move", miniSystem(state, "你回到写着‘门’的偏房。桌上放着寺史册和《清心静神经》。"), true
	}
	if miniHasAny(text, "看看房牌", "看偏房", "看走廊", "观察回廊") {
		miniSetFlag(state, "corridor_seen")
		return "inspect", miniSystem(state, "四扇房门依次写着‘听、灯、纸、门’。远处封闭的钟楼门后传来一声很轻的金属碰响。"), true
	}
	return "story", miniDialogue(state, "陆沉", "各位施主，二更到了。拿好红烛，回房早些休息；五更天亮再做早课。"), true
}

func (e *Engine) storyRoom(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "点燃红烛", "点红烛", "点烛", "把红烛点上") {
		if !state.Flags["red_candle_held"] {
			return "blocked", miniSystem(state, "你手边没有红烛。先回东院回廊领取。"), true
		}
		miniSetFlag(state, "red_candle_lit")
		return "story", miniSystem(state, "红烛亮了。它只能照清眼前，不会替你认出门外的人。"), true
	}
	if miniHasAny(text, "看寺史", "读寺史", "查看历史", "查看寺庙历史", "看历史册", "翻阅寺史") {
		miniSetFlag(state, "history_read")
		miniClue(state, "游客版寺史写着顾怀山七年前圆寂成佛，但验身一栏被撕掉")
		return "inspect", miniSystem(state, "寺史册写着‘七年前方丈顾怀山于方丈室圆寂，灯灭即成佛’。页角的验身一栏被整齐撕走。"), true
	}
	if miniHasAny(text, "读经", "看经文", "清心静神", "翻开经书", "朗读经文") {
		miniSetFlag(state, "mind_script_learned")
		miniClue(state, "清心静神经末页：心不逐声，眼不随影；一念既起，归于清明；灯在我前，门在我后")
		return "inspect", miniSystem(state, "末页写着：‘心不逐声，眼不随影；一念既起，归于清明；灯在我前，门在我后。’"), true
	}
	if miniHasAny(text, "看看红烛", "看烛芯", "看蜡泪", "观察窗外", "看看窗外") {
		return "inspect", miniSystem(state, "红烛的蜡面有指甲般的划痕，窗外只看见回廊灯线和将要升起的月光。"), true
	}
	if miniHasAny(text, "睡觉", "睡下", "入睡", "躺下", "闭眼") {
		if !state.Flags["red_candle_lit"] {
			return "blocked", miniSystem(state, "你还没有点燃红烛。陆沉说过，火不能灭；先说‘点燃红烛’。"), true
		}
		miniSetFlag(state, "slept_before_three_gongs")
		miniSetFlag(state, "candle_went_out")
		state.Flags["red_candle_lit"] = false
		e.setMiniScene(state, "mini_wake_three_gongs")
		return "sleep", miniSystem(state, "你在更锣声和烛火的轻响里睡着了。过了不知多久，三声沉闷的锣把你惊醒。"), true
	}
	return "story", miniSystem(state, "房内有红烛、寺史册、《清心静神经》和入住残页。你可以点烛、读寺史、读经，或在点烛后睡下。"), true
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
		return "story", miniSystem(state, "你重新点燃红烛。拖行声退到廊尾，门外暂时只剩月光。接下来先听清敲门次数，不要急着开门。"), true
	}
	if miniHasAny(text, "看红烛", "看烛芯", "看门外", "听声音") {
		return "inspect", miniSystem(state, "红烛已经熄灭，蜡泪凝成黑红色；门外有湿重的呼吸和一声指甲刮门。"), true
	}
	return "story", miniSystem(state, "红烛已经熄灭。你可以说‘续燃红烛’，也可以选择不点燃，但黑暗不会等你。"), true
}
