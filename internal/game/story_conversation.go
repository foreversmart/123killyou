package game

import (
	"fmt"
	"strings"

	"nightwatch/internal/content"
)

// Unmatched speech is a new conversation turn, never a replay of a scene cue.
// Only the session may fill the empty line after generating the NPC's response.
func (e *Engine) storyConversation(state *State, text string) (string, string, bool) {
	var addressed content.NPC
	firstMention := len(text)
	for _, npc := range e.content.NPCs() {
		if npc.ID == "player" {
			continue
		}
		for _, name := range append([]string{npc.Name}, npc.Aliases...) {
			if position := strings.Index(text, Normalize(name)); position >= 0 && position < firstMention {
				addressed, firstMention = npc, position
			}
		}
	}
	if addressed.ID != "" {
		if speaker, ok := storyConversationSpeaker(state, addressed); ok {
			return "dialogue", miniDialogue(state, speaker, ""), true
		}
		return "clarify", miniSystem(state, fmt.Sprintf("你在问%s，但这里暂时没有能与他交谈的机会。请叫一位在场的人，或说出你想查看的东西。", addressed.Name)), true
	}
	if npcID, ok := e.NPCForDialogue(*state); ok && npcID != "player" {
		for _, npc := range e.content.NPCs() {
			if npc.ID == npcID {
				if speaker, present := storyConversationSpeaker(state, npc); present {
					return "dialogue", miniDialogue(state, speaker, ""), true
				}
			}
		}
	}
	for _, person := range state.Actors {
		for _, npc := range e.content.NPCs() {
			if npc.ID != "player" && storyActorNPC(person) == npc.ID {
				if speaker, present := storyConversationSpeaker(state, npc); present {
					return "dialogue", miniDialogue(state, speaker, ""), true
				}
			}
		}
	}
	words := []rune(text)
	if len(words) > 40 {
		words = append(words[:40], '…')
	}
	return "clarify", miniSystem(state, fmt.Sprintf("听到了你说的“%s”。这里暂时没有能回应的交谈对象；如果你想行动，请说清要查看什么，或准备做什么。", string(words))), true
}

func storyConversationSpeaker(state *State, npc content.NPC) (string, bool) {
	for _, person := range state.Actors {
		if person.Visible && storyActorNPC(person) == npc.ID {
			return person.Name, true
		}
	}
	if state.SceneKey == "mini_three_knocks" && miniCompanionID(state) == npc.ID {
		return miniCompanionName(state) + "（门外）", true
	}
	return "", false
}

func storyActorNPC(person SceneActor) string {
	if person.ID == "luchen" {
		return "keeper"
	}
	if person.ID == "skin_double" || person.ID == "companion" {
		return person.Portrait
	}
	return strings.TrimSpace(person.ID)
}

func miniReplayRequest(text string) bool {
	switch text {
	case "重听当前对白", "重听这句", "再说一遍", "请再说一遍":
		return true
	default:
		return false
	}
}
