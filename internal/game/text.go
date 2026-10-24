package game

import (
	"strings"
	"unicode"

	"nightwatch/internal/content"
)

func Normalize(text string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsPunct(r) || unicode.IsSpace(r) {
			return -1
		}
		return unicode.ToLower(r)
	}, text)
}

func Has(text string, words ...string) bool {
	for _, word := range words {
		if strings.Contains(text, word) {
			return true
		}
	}
	return false
}

func feedback(state *State, text string) string { state.LastAction = text; return text }

func narrate(state *State, text string) string {
	state.Dialogue = Dialogue{"你", text, "player"}
	return feedback(state, text)
}

func reply(state *State, profile content.NPC, text string) string {
	state.Dialogue = Dialogue{Speaker: profile.Name, Text: text, Portrait: profile.Portrait}
	return feedback(state, text)
}
