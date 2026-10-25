package game

// Story devotion changes are deliberately small and bounded. The values are
// part of the story contract: every event is applied once unless it models a
// repeated action (such as leaving a candle unlit or answering a knock).
const (
	DevotionGateLookDelta        = 3
	DevotionBuddhaLookDelta      = 4
	DevotionMeatPorridgeDelta    = -8
	DevotionPersuadeRefusalDelta = 5
	DevotionScriptureDelta       = 4
	DevotionCandleUnlitDelta     = -1
	DevotionGhostDialogueDelta   = -2
	DevotionSkinWitnessDelta     = -6
	LowDevotionMonsterThreshold  = 30
)

func applyDevotionEvent(state *State, marker string, delta int) bool {
	if state == nil {
		return false
	}
	if state.Flags == nil {
		state.Flags = map[string]bool{}
	}
	if state.Flags[marker] {
		return false
	}
	state.Flags[marker] = true
	clampDevotion(state, delta)
	return true
}

// reconcileStoryDevotion translates durable story flags into the player's
// devotion value. It runs after each accepted story action, so flags written by
// any scene handler are settled at one boundary.
func (e *Engine) reconcileStoryDevotion(state *State) {
	if state == nil || !state.StoryMode || state.Flags["story_dead"] {
		return
	}
	if state.Flags["gate_seen"] {
		applyDevotionEvent(state, "devotion_gate_seen", DevotionGateLookDelta)
	}
	if state.Flags["buddha_seen"] {
		applyDevotionEvent(state, "devotion_buddha_seen", DevotionBuddhaLookDelta)
	}
	if state.Flags["meal_player_ate"] {
		applyDevotionEvent(state, "devotion_meat_porridge", DevotionMeatPorridgeDelta)
	}
	if state.Flags["persuasion_success"] {
		applyDevotionEvent(state, "devotion_persuasion", DevotionPersuadeRefusalDelta)
	}
	if state.Flags["mind_script_learned"] {
		applyDevotionEvent(state, "devotion_scripture", DevotionScriptureDelta)
	}
	if state.Flags["candle_went_out"] && !state.Flags["red_candle_lit"] {
		state.CandleUnlitTurns++
		clampDevotion(state, DevotionCandleUnlitDelta)
	}
}

// recordGhostDialogue applies the repeated penalty for answering a hostile
// voice at the door. Each accepted reply is a separate temptation, so it is
// intentionally repeatable rather than guarded by a one-shot marker.
func recordGhostDialogue(state *State) {
	if state == nil {
		return
	}
	if state.Flags == nil {
		state.Flags = map[string]bool{}
	}
	state.GhostDialogueTurns++
	state.Flags["ghost_dialogue_started"] = true
	clampDevotion(state, DevotionGhostDialogueDelta)
}

func recordSkinWitness(state *State) {
	applyDevotionEvent(state, "devotion_skin_seen", DevotionSkinWitnessDelta)
}

func lowDevotionMonsterThreat(state *State) bool {
	if state == nil || state.Devotion > LowDevotionMonsterThreshold {
		return false
	}
	if state.Flags == nil {
		state.Flags = map[string]bool{}
	}
	state.Flags["low_devotion_monsters"] = true
	return true
}
