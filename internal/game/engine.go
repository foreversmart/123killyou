package game

import (
	"nightwatch/internal/content"
	"strings"
)

type Engine struct {
	content   *content.Catalog
	storyRoll func() int
}

func NewEngine(catalog *content.Catalog) *Engine { return &Engine{content: catalog} }
func (e *Engine) Initial(id string) State {
	state := State{
		ID:        id,
		Revision:  1,
		Devotion:  e.content.World().InitialDevotion,
		Inventory: []Item{},
		Clues:     []string{},
		Flags:     map[string]bool{},
		Effect:    Effect{Kind: "none"},
	}
	e.StartMiniStory(&state)
	return state
}

// StartMiniStory applies the opening scene without narrating what is visible.
func (e *Engine) StartMiniStory(state *State) {
	if state == nil {
		return
	}
	state.StoryMode = true
	miniSetFlag(state, "arrived")
	e.setMiniScene(state, "mini_arrival")
	miniObserve(state, "阳光从车窗斜进来，大巴停在灯影寺山门前。车门打开，鸟鸣穿过树叶，四只小旅行包已经放在檐下靠墙处。")
}

// Panels keep interaction with the narrator; world dialogue resumes after closing.
func (e *Engine) Apply(state *State, text string) (string, string) {
	defer func() {
		if state.StoryMode {
			syncMiniStaging(state)
		}
	}()
	if Normalize(text) == "调试跳到下一剧情场景" {
		return e.skipMiniScene(state)
	}
	if state.StoryMode && miniReplayRequest(Normalize(text)) {
		return "replay", state.Dialogue.Text
	}
	state.DialogueNext = ""
	text = Normalize(text)
	if message, clarify := ActionClarification(text); clarify {
		return "clarify", feedback(state, message)
	}
	if intent, speak, ok := e.system(state, text); ok {
		return intent, speak
	}
	if intent, speak, ok := e.story(state, text); ok {
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
	if state.StoryMode {
		speaker := state.Dialogue.Speaker
		for _, npc := range e.content.NPCs() {
			names := append([]string{npc.Name}, npc.Aliases...)
			for _, name := range names {
				if speaker == name || strings.HasPrefix(speaker, name+"（") || strings.HasPrefix(speaker, name+"·") {
					return npc.ID, true
				}
			}
		}
		return "", false
	}
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
