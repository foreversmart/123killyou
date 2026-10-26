package game

func (e *Engine) storyDawnTrap(state *State, text string) (string, string, bool) {
	if state.Flags["dawn_knocks_dialogue_pending"] && text != dawnKnocksDialogueAdvance {
		// The normal client keeps choices hidden until all three knocks finish.
		// Accept a direct voice command from older clients without letting the
		// pending marker block the actual choice.
		delete(state.Flags, "dawn_knocks_dialogue_pending")
		state.DialogueNext = ""
	}
	if text == dawnKnocksDialogueAdvance {
		delete(state.Flags, "dawn_knocks_dialogue_pending")
		state.DialogueNext = ""
		return "story", miniDialogue(state, miniDoubleName(state)+"（门外）", "是我，天亮了。你开门，我们一起去做早课。"), true
	}
	if state.Flags["escape_dialogue_pending"] && text != escapeDialogueAdvance {
		// The UI keeps the two choices hidden during the short pause. Accept a
		// direct voice choice for older clients by resolving that pause early.
		state.Flags["escape_dialogue_pending"] = false
		state.DialogueNext = ""
	}
	if state.Flags["escape_sleep_pending"] {
		if text == dawnSleepAdvance {
			state.Flags["escape_sleep_pending"] = false
			e.setMiniScene(state, "mini_dawn_trap")
			miniShot(state, "dawn_gongs")
			return "sleep", miniObserve(state, "又过了好一会儿，四声响亮的金属更锣依次传来。四声余响消退后，远处才响起一声低长的钟；窗纸仍然漆黑。"), true
		}
		state.DialogueNext = dawnSleepAdvance
		return "blocked", miniSystem(state, "过了好一会儿，先等这一段安静过去。"), true
	}
	if state.ShotKey == "escape_return" && text == escapeDialogueAdvance {
		state.Flags["escape_dialogue_pending"] = false
		state.DialogueNext = ""
		return "story", miniDialogue(state, "赵熙", "啊，刚刚真的是太惊险了，那究竟是什么怪物？"), true
	}
	if (state.ShotKey == "escape_return" || state.ShotKey == "escape_outside") && miniHasAny(text, "躺下睡觉", "躺下", "睡觉", "休息", "歇一会儿") {
		miniSetFlag(state, "escape_sleep_pending")
		miniShot(state, "escape_sleep_wait")
		state.DialogueNext = dawnSleepAdvance
		return "sleep", miniObserve(state, "你躺下歇着。过了好一会儿，门外仍没有动静；红烛的火苗在黑暗里慢慢缩短。"), true
	}
	if (state.ShotKey == "escape_return" || state.ShotKey == "escape_outside") && miniHasAny(text, "再去看看外面", "看看外面", "去看看外面", "观察门外") {
		miniShot(state, "escape_outside")
		return "inspect", miniObserve(state, "你重新贴近门边听了一会儿。回廊没有脚步，门缝红蜡还在；过了一会儿，远处只剩风声。"), true
	}
	if miniHasAny(text, "算作第五声", "把钟算锣", "把钟当锣", "以为天亮", "已经天亮", "开门做早课") {
		miniSetFlag(state, "fake_dawn_knocks")
		miniShot(state, "dawn_knocks")
		miniSetFlag(state, "dawn_knocks_dialogue_pending")
		state.DialogueNext = dawnKnocksDialogueAdvance
		return "story", miniObserve(state, "门外先响起三下敲门，间隔清楚。敲声停下后，门外暂时没有说话。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "房门打开，窗外仍黑。三敲声后响起与主角相同的声音，黑影涌过门槛。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "等待真正的五更", "等五更", "等天亮") {
		miniSetFlag(state, "dawn_waited")
		miniShot(state, "dawn_wait")
		state.DialogueNext = "继续听"
		return "story", miniObserve(state, "红烛移回门边，门闩保持扣紧。窗纸仍黑着，门外的呼吸慢慢退远。"), true
	}
	if state.Flags["dawn_waited"] && miniContinue(text) {
		e.setMiniScene(state, "mini_dawn")
		return "move", miniObserve(state, "真正的五声更锣响起。鸡鸣先起，檐鸟应声，淡青晨光从窗纸背后铺开，门外的呼吸消失。三位同伴站在各自的房门前。"), true
	}
	if miniHasAny(text, "重听", "听钟", "听锣", "辨认钟声", "辨认锣声") {
		miniSetFlag(state, "gong_bell_distinguished")
		return "inspect", miniObserve(state, "近处四声更锣间隔均匀，余震停后，钟楼方向传来一声低沉悠长的钟。窗纸始终漆黑。"), true
	}
	if miniHasAny(text, "回答姓名", "开口回应", "回答门外", "和门外说话", "与门外对话", "继续和鬼说话") {
		recordGhostDialogue(state)
		miniSetFlag(state, "name_echo_heard")
		return "story", miniDialogue(state, "赵熙（门外回声）", "是我。你怎么还不开门？"), true
	}
	if miniHasAny(text, "听声音", "看窗外", "观察天色") {
		return "inspect", miniObserve(state, "四声更锣的余震散去，远处一声低沉的钟缓缓回荡。窗纸仍黑，红烛在门边燃着。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyDawn(state *State, text string) (string, string, bool) {
	defer func() {
		if state.ShotKey == "dawn_gate" || state.SceneKey == "mini_ending" {
			e.returnMiniPermit(state)
		}
	}()
	if miniHasAny(text, "看看照片") {
		return "inspect", miniDialogue(state, "林岚", "相机还在，可惜拍的照片全是黑的，只剩一圈红光……等等回到车上我再看看。"), true
	}
	if miniHasAny(text, "看看门轴") {
		return "inspect", miniDialogue(state, "周砚", "这里怎么出现了一道道痕，昨天没有啊，好奇怪。"), true
	}
	if miniHasAny(text, "整理行李") {
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "许栀", "四只包都在，别落东西。下次散心去海边吧，寺庙的早课我听一次就够了。"), true
	}
	if miniHasAny(text, "交还通行凭", "归还通行凭", "交还通信凭证", "归还通信凭证", "归还通证凭证") {
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "陆沉", "通行凭我收下了。"), true
	}

	if miniContinue(text) || miniHasAny(text, "听天亮对白") {
		return "story", miniSequence(state, "dawn_intro", dawnLines), true
	}
	if miniHasAny(text, "坐大巴", "回家", "上车") {
		miniSetFlag(state, "story_finished")
		e.setMiniScene(state, "mini_ending")
		state.DialogueNext = ""
		return "ending", miniObserve(state, "四只行李放进大巴，车门合上。大巴沿山路驶向弯道，远处寺庙的灰瓦隐在树影与晨雾间。"), true
	}
	if miniHasAny(text, "住持去哪", "询问住持", "问住持") {
		miniShot(state, "dawn_gate")
		return "dialogue", miniDialogue(state, "陆沉", "我也不知道住持去了哪里。"), true
	}
	return e.storyConversation(state, text)
}
