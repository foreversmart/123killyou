package game

// restoreSafeStoryContinuation keeps a safe scripted handoff pending while an
// NPC answers an unrelated player utterance. The reply is played first; the
// client can then submit the original command after its normal quiet window.
// Scene changes, investigations, clarifications and all dangerous scenes
// intentionally clear the pending command.
func restoreSafeStoryContinuation(state *State, scene, shot, overlay, next, intent string) {
	if intent != "dialogue" || state.SceneKey != scene || state.ShotKey != shot || state.Overlay != overlay || overlay != "" {
		return
	}
	if !safeStoryContinuation(scene, next) {
		return
	}
	if !safeStorySpeaker(state.Dialogue.Speaker) {
		return
	}
	state.DialogueNext = next
}

func safeStoryContinuation(scene, next string) bool {
	switch scene {
	case "mini_arrival":
		return next == "继续听" || next == "自动登记入住"
	case "mini_register":
		return next == "继续听" || next == "自动放好行李" || next == "自动去斋堂"
	case "mini_refectory":
		return next == "继续听" || next == "自动结束晚膳"
	case "mini_corridor_candle", "mini_dawn":
		return next == "继续听"
	default:
		return false
	}
}

func safeStorySpeaker(speaker string) bool {
	switch speaker {
	case "林岚", "周砚", "许栀", "陆沉", "慧普", "神公":
		return true
	default:
		return false
	}
}
