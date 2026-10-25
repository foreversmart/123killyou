package game

func (e *Engine) storyDeath(state *State, message string) (string, string) {
	state.RetryScene = state.SceneKey
	miniSetFlag(state, "story_dead")
	state.Effect = Effect{Kind: "glitch", Strength: .8, Duration: 1800}
	source := state.SceneKey
	e.setMiniScene(state, "mini_death")
	state.ShotKey = "death_" + source
	state.SceneText = message
	return "death", miniInner(state, message+"眼前停在烛光熄灭的一刻。可以从最近的安全节点重试。")
}

func (e *Engine) retryMiniStory(state *State) (string, string, bool) {
	scene := state.RetryScene
	if scene == "" || scene == "mini_death" {
		scene = "mini_room"
	}
	if scene == "mini_oracle" {
		scene = "mini_listen"
	}
	for _, flag := range []string{"story_dead", "double_calm", "double_frenzy", "double_refused_candle", "double_scripture_1", "double_scripture_2", "double_scripture_3", "double_scripture_4", "cup_cast_counted", "cup_jiao_rescue", "cup_failed", "cup_roll_sacred", "cup_roll_laugh", "cup_roll_dark", "fake_dawn_knocks", "dawn_waited"} {
		delete(state.Flags, flag)
	}
	state.Flags["red_candle_lit"] = scene != "mini_wake_three_gongs" && scene != "mini_room"
	state.Effect = Effect{Kind: "none"}
	e.setMiniScene(state, scene)
	state.DialogueNext = ""
	if scene == "mini_listen" {
		delete(state.Flags, "vase_broken")
		miniSetFlag(state, "skin_seen")
		miniShot(state, "listen_skin")
	}
	if scene == "mini_double" {
		state.DialogueNext = "继续听"
	}
	return "retry", miniInner(state, "我重新站在刚才还能选择的位置。已看过的纸页和记住的话还在，这次先看清眼前。"), true
}
