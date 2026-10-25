package game

func (e *Engine) setMiniScene(state *State, key string) {
	scene, ok := miniScenes[key]
	if !ok {
		return
	}
	state.SceneKey = scene.key
	state.ShotKey = miniOpeningShots[key]
	state.DialogueNext = ""
	switch key {
	case "mini_arrival", "mini_register", "mini_refectory", "mini_corridor_candle", "mini_listen", "mini_oracle", "mini_double", "mini_dawn":
		state.DialogueNext = "继续听"
	}
	state.SceneName = scene.name
	state.SceneText = scene.text
	state.SceneProps = append([]string{}, scene.props...)
	state.Actors = miniSceneActors(key)
	state.Room = scene.room
	state.RoomName = scene.roomName
	state.Overlay = ""
	state.FocusItem = ""
	syncMiniStaging(state)
}

func miniSystem(state *State, text string) string {
	return feedback(state, text)
}

func miniDialogue(state *State, speaker, text string) string {
	portrait := miniVoicePortrait(speaker)
	state.Dialogue = Dialogue{Speaker: speaker, Text: text, Portrait: portrait}
	state.LastAction = text
	return text
}

func miniInner(state *State, text string) string {
	return miniDialogue(state, "你·心声", text)
}

func miniClue(state *State, clue string) {
	for _, existing := range state.Clues {
		if existing == clue {
			return
		}
	}
	state.Clues = append(state.Clues, clue)
}

func miniSetFlag(state *State, key string) {
	if state.Flags == nil {
		state.Flags = map[string]bool{}
	}
	state.Flags[key] = true
}

func miniHasAny(text string, words ...string) bool { return Has(text, words...) }
