package game

func (e *Engine) storyDawnTrap(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "算作第六声", "把钟算锣", "把锣算第六声", "以为天亮", "已经天亮", "开门做早课") {
		miniSetFlag(state, "fake_dawn_knocks")
		miniShot(state, "dawn_knocks")
		return "story", miniDialogue(state, miniDoubleName(state)+"（门外）", "是我，天亮了。你开门，我们一起去做早课。"), true
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
		return "move", miniObserve(state, "五声更锣再次响起。鸡鸣先起，檐鸟应声，淡青晨光从窗纸背后铺开，门外的呼吸消失。三位同伴站在各自的房门前。"), true
	}
	if miniHasAny(text, "重听", "听钟", "听锣", "辨认钟声", "辨认锣声") {
		miniSetFlag(state, "gong_bell_distinguished")
		return "inspect", miniObserve(state, "近处五声更锣间隔均匀，余震停后，钟楼方向传来一声低长的锣。窗纸始终漆黑。"), true
	}
	if miniHasAny(text, "回答姓名", "开口回应", "回答门外", "和门外说话", "与门外对话", "继续和鬼说话") {
		recordGhostDialogue(state)
		miniSetFlag(state, "name_echo_heard")
		return "story", miniDialogue(state, "赵熙（门外回声）", "是我。你怎么还不开门？"), true
	}
	if miniHasAny(text, "听声音", "看窗外", "观察天色") {
		return "inspect", miniObserve(state, "五声更锣的余震散去，远处一声低长的锣慢慢拖长。窗纸仍黑，红烛在门边燃着。"), true
	}
	return e.storyConversation(state, text)
}

func (e *Engine) storyDawn(state *State, text string) (string, string, bool) {
	if miniHasAny(text, "看看照片") {
		return "inspect", miniDialogue(state, "林岚", "相机还在，可惜拍的照片全是黑的，只剩一圈红光……等等回到车上我再看看。"), true
	}
	if miniHasAny(text, "看看门轴") {
		return "inspect", miniDialogue(state, "周砚", "这道痕昨晚没有。先不碰，回去我把平面图画出来，再对照门的方向。"), true
	}
	if miniHasAny(text, "整理行李") {
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "许栀", "四只包都在，别落东西。下次散心去海边吧，寺庙的早课我听一次就够了。"), true
	}
	if miniHasAny(text, "交还通行凭") {
		miniSetFlag(state, "permit_returned")
		e.removeMiniItem(state, "permit")
		miniShot(state, "dawn_gate")
		return "story", miniDialogue(state, "陆沉", "通行凭我收下。沿石阶下山时别回头数灯，也别把昨晚听见的每句话都带走。"), true
	}

	if miniContinue(text) || miniHasAny(text, "听天亮对白") {
		return "story", miniSequence(state, "dawn_intro", dawnLines), true
	}
	if miniHasAny(text, "坐大巴", "回家", "上车") {
		miniSetFlag(state, "story_finished")
		e.setMiniScene(state, "mini_ending")
		state.DialogueNext = ""
		return "ending", miniObserve(state, "四只行李放进大巴，车门合上。晨雾退向车后，后视镜里的‘明照寺’三个旧字闪了一下，山门消失在弯道后。"), true
	}
	if miniHasAny(text, "留下残页", "交还残页", "把残页留下") {
		miniSetFlag(state, "page_left")
		e.removeMiniItem(state, "page")
		miniShot(state, "dawn_gate")
		return "dialogue", miniDialogue(state, "陆沉", "有些名字，昨晚没有被记上。这页纸留下吧，你们该走了。"), true
	}
	if miniHasAny(text, "住持去哪", "询问住持", "问住持") {
		miniShot(state, "dawn_gate")
		return "dialogue", miniDialogue(state, "陆沉", "住持的事，先别在山门问。五更后门会开，下山时别回头数灯。"), true
	}
	return e.storyConversation(state, text)
}
