package game

import "nightwatch/internal/content"

type Engine struct{ content *content.Catalog }

func NewEngine(catalog *content.Catalog) *Engine { return &Engine{content: catalog} }
func (e *Engine) Initial(id string) State {
	world := e.content.World()
	profile, _ := e.content.NPC(world.InitialNPC)
	inventory := []Item{}
	for _, id := range world.StartingItems {
		item, _ := e.content.Item(id)
		inventory = append(inventory, Item(item))
	}
	return State{ID: id, Revision: 1, Room: world.InitialRoom, RoomName: world.InitialRoomName, Devotion: world.InitialDevotion, Inventory: inventory, Clues: []string{}, Flags: map[string]bool{}, Dialogue: Dialogue{Speaker: profile.Name, Text: profile.Intro, Portrait: profile.Portrait}, LastAction: "说出你的行动，房间会回应。", Effect: Effect{Kind: "none"}}
}

// Panels keep interaction with the narrator; world dialogue resumes after closing.
func (e *Engine) Apply(state *State, text string) (string, string) {
	text = Normalize(text)
	if message, clarify := ActionClarification(text); clarify {
		return "clarify", feedback(state, message)
	}
	if intent, speak, ok := e.system(state, text); ok {
		return intent, speak
	}
	if intent, speak, ok := e.movement(state, text); ok {
		return intent, speak
	}
	handover := Has(text, "给", "交付", "递给", "交给", "归还")
	if state.Overlay != "" {
		if !handover {
			if intent, speak, ok := e.inspection(state, text); ok {
				return intent, speak
			}
		}
		return "blocked", feedback(state, "当前正在查看信息面板。说“返回”关闭面板后，再与人物交谈或交付物品；也可以继续查看其他信息。")
	}
	if handover {
		return e.give(state, text)
	}
	if intent, speak, ok := e.inspection(state, text); ok {
		return intent, speak
	}
	return e.dialogue(state, text)
}
func (e *Engine) NPCForDialogue(state State) (string, bool) {
	for _, npc := range e.content.NPCs() {
		if npc.Room == state.Room && npc.Name == state.Dialogue.Speaker && npc.Portrait == state.Dialogue.Portrait {
			return npc.ID, true
		}
	}
	return "", false
}
func (e *Engine) currentNPC(state State, text string) (content.NPC, bool) {
	candidates := []content.NPC{}
	for _, npc := range e.content.NPCs() {
		if npc.Room != state.Room {
			continue
		}
		candidates = append(candidates, npc)
		if Has(text, append([]string{npc.Name}, npc.Aliases...)...) {
			return npc, true
		}
	}
	for _, npc := range candidates {
		if npc.Portrait == state.Dialogue.Portrait {
			return npc, true
		}
	}
	if len(candidates) == 1 {
		return candidates[0], true
	}
	return content.NPC{}, false
}
func (e *Engine) returnToNPC(state *State) string {
	npc, ok := e.currentNPC(*state, "")
	if !ok {
		return feedback(state, "房间里没有人回应。")
	}
	return reply(state, npc, npc.Return)
}
func clampDevotion(state *State, delta int) { state.Devotion = max(0, min(100, state.Devotion+delta)) }
