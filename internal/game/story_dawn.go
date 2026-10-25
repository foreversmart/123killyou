package game

func (e *Engine) storyDawnTrap(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "算作第六声", "把钟算锣", "以为天亮", "已经天亮", "开门做早课") {
		miniSetFlag(state, "fake_dawn_knocks")
		miniShot(state, "dawn_knocks")
		return "story", miniDialogue(state, miniDoubleName(state)+"（门外）", "是我，天亮了。开门一起做早课。大家都在等你。"), true
	}
	if miniHasAny(text, "开门") && !miniHasAny(text, "不开门") {
		intent, speak := e.storyDeath(state, "我打开门。窗外仍是黑的，门外的三敲声变成我自己的声音，黑影从门缝外涌了进来。")
		return intent, speak, true
	}
	if miniHasAny(text, "不开门", "等待真正的五更", "等五更", "等天亮") {
		miniSetFlag(state, "dawn_waited")
		miniShot(state, "dawn_wait")
		state.DialogueNext = "继续听"
		return "story", miniInner(state, "我没有开门，也没有回答名字。窗外还黑着，再等一组真正的更锣。"), true
	}
	if state.Flags["dawn_waited"] && miniContinue(text) {
		e.setMiniScene(state, "mini_dawn")
		return "move", miniInner(state, "又一组五声更锣响起，鸡鸣和檐鸟紧跟着叫了起来。窗纸终于透出晨光，门外的呼吸声不见了。"), true
	}
	if miniHasAny(text, "重听", "听钟", "辨认钟声") {
		miniSetFlag(state, "gong_bell_distinguished")
		return "inspect", miniInner(state, "我重新听了一遍。前面的声音间隔均匀，最后一声更低、更长。窗外的黑色并没有变浅。"), true
	}
	if miniHasAny(text, "回答姓名", "开口回应", "回答门外") {
		miniSetFlag(state, "name_echo_heard")
		return "story", miniDialogue(state, "你（门外回声）", "是我。你怎么还不开门？"), true
	}
	return "story", miniInner(state, "五声更锣之后还有一声钟，窗外却仍然很黑。我得自己分清声源。"), true
}

func (e *Engine) storyDawn(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看看照片") {
		return "inspect", miniDialogue(state, "林岚", "我明明按过快门。全是黑的，只有一圈红光，像隔着镜头盯着我。"), true
	}
	if miniHasAny(text, "看看门轴") {
		return "inspect", miniDialogue(state, "周砚", "新划痕是从里面撞出来的。昨晚入住的时候，这里还没有。"), true
	}
	if miniHasAny(text, "整理行李") {
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "许栀", "四只包都在，别落东西。车就在山门下，下次真去海边。"), true
	}
	if miniHasAny(text, "交还通行凭") {
		miniSetFlag(state, "permit_returned")
		e.removeMiniItem(state, "permit")
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "陆沉", "凭我收下。沿石阶下去，别回头数灯。"), true
	}

	if miniContinue(text) || miniHasAny(text, "听天亮对白") {
		return "story", miniSequence(state, "dawn_intro", dawnLines), true
	}
	if miniHasAny(text, "坐大巴", "回家", "上车") {
		miniSetFlag(state, "story_finished")
		e.setMiniScene(state, "mini_ending")
		state.DialogueNext = ""
		return "ending", miniInner(state, "我们四个都坐上大巴。晨雾退到车后，后视镜里‘明照寺’三个旧字闪了一下。我没有再数山门里的灯。"), true
	}
	if miniHasAny(text, "留下残页", "交还残页", "把残页留下") {
		miniSetFlag(state, "page_left")
		e.removeMiniItem(state, "page")
		miniShot(state, "dawn_gate")
		return "dialogue", miniDialogue(state, "陆沉", "有些名字，昨晚没有被记上。这页纸留下吧，你们该走了。"), true
	}
	if miniHasAny(text, "住持去哪", "询问住持", "问住持") {
		miniShot(state, "dawn_gate")
		return "dialogue", miniDialogue(state, "陆沉", "五更后门会开。别回头数灯，也别把昨晚听见的每句话都带走。"), true
	}
	return "story", miniInner(state, "林岚、周砚、许栀都在。衣服完整，眼下却都有一层疲倦。四个人，终于又站在同一片晨光里。"), true
}
