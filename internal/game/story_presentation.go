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
	case "mini_four_knocks":
		// The empty-door shot has no spoken line to advance it. Give the
		// client an explicit quiet-window command so an idle player reaches
		// the following three-knock scene after a short, visible pause.
		state.DialogueNext = fourKnocksAutoAdvance
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
	return miniDialogue(state, "赵熙·心声", text)
}

// Observations belong to the scene and its sound sources, never the speech
// channel. Clearing Dialogue also prevents replaying the previous character.
func miniObserve(state *State, text string) string {
	state.SceneText = text
	state.LastAction = text
	state.Dialogue = Dialogue{}
	return ""
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
