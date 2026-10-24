package content

import (
	"encoding/json"
	"testing"
)

func TestNarratorIsValidatedSeparatelyFromNPCs(t *testing.T) {
	catalog, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	narrator := catalog.Narrator()
	if narrator.ID != "narrator" || narrator.Prompt == "" || narrator.Voice.ProviderVoiceID == "" {
		t.Fatal("missing narrator configuration")
	}
	if _, exists := catalog.NPC("narrator"); exists {
		t.Fatal("narrator became an NPC")
	}
	for _, kind := range []string{"wrong-id", "missing-voice", "missing-prompt", "empty-prompt"} {
		t.Run(kind, func(t *testing.T) {
			pack := testPack(t)
			profile := narrator
			switch kind {
			case "wrong-id":
				profile.ID = "keeper"
			case "missing-voice":
				profile.Voice.ProviderVoiceID = " "
			case "missing-prompt":
				delete(pack, "narrator/prompt.md")
			case "empty-prompt":
				pack["narrator/prompt.md"].Data = []byte(" ")
			}
			pack["narrator/profile.json"].Data, _ = json.Marshal(profile)
			if _, err := LoadFS(pack); err == nil {
				t.Fatal("invalid narrator accepted")
			}
		})
	}
}
