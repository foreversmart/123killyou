package game

func (e *Engine) dialogue(state *State, text string) (string, string) {
	npc, ok := e.currentNPC(*state, text)
	if !ok {
		return "clarify", feedback(state, "这里没有明确的交谈对象。你可以说出人物称呼，或说“看看地图”。")
	}
	for _, rule := range npc.DialogueRules {
		if !Has(text, rule.Keywords...) {
			continue
		}
		clampDevotion(state, rule.DevotionDelta)
		if rule.Glitch {
			state.Effect = Effect{Kind: "glitch", Strength: .7, Duration: 1600}
		}
		if rule.DevotionDelta < 0 && state.Devotion < npc.ExposureThreshold {
			state.Caught = true
			return "dialogue", reply(state, npc, npc.ExposedReply)
		}
		return "dialogue", reply(state, npc, rule.Reply)
	}
	return "dialogue", reply(state, npc, npc.Default)
}
