package content

import (
	"encoding/json"
	"io/fs"
	"testing"
	"testing/fstest"
)

func testPack(t *testing.T) fstest.MapFS {
	t.Helper()
	pack := fstest.MapFS{}
	err := fs.WalkDir(files, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !entry.IsDir() {
			raw, err := fs.ReadFile(files, name)
			if err != nil {
				return err
			}
			pack[name] = &fstest.MapFile{Data: raw}
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return pack
}
func TestContentRejectsUnknownFieldsBrokenRewardsAndMissingPrompts(t *testing.T) {
	for _, kind := range []string{"unknown-field", "missing-reward", "missing-prompt", "missing-initial-npc", "blank-reply", "missing-return", "empty-keyword", "empty-alias", "empty-description"} {
		t.Run(kind, func(t *testing.T) {
			pack := testPack(t)
			switch kind {
			case "unknown-field":
				pack["npcs/keeper/profile.json"].Data = []byte(`{"unknown":true}`)
			case "missing-reward":
				var npc NPC
				json.Unmarshal(pack["npcs/keeper/profile.json"].Data, &npc)
				npc.Exchanges[0].RewardID = "does_not_exist"
				pack["npcs/keeper/profile.json"].Data, _ = json.Marshal(npc)
			case "missing-prompt":
				delete(pack, "npcs/keeper/prompt.md")
			case "missing-initial-npc":
				pack["world.json"].Data = []byte(`{"initialNpc":"missing"}`)
			case "empty-description":
				var items []Item
				json.Unmarshal(pack["items.json"].Data, &items)
				items[0].Description = " "
				pack["items.json"].Data, _ = json.Marshal(items)
			default:
				var npc NPC
				json.Unmarshal(pack["npcs/keeper/profile.json"].Data, &npc)
				switch kind {
				case "blank-reply":
					npc.Default = " \n "
				case "missing-return":
					npc.Return = ""
				case "empty-keyword":
					npc.DialogueRules[0].Keywords = []string{""}
				case "empty-alias":
					npc.Aliases = []string{" "}
				}
				pack["npcs/keeper/profile.json"].Data, _ = json.Marshal(npc)
			}
			if _, err := LoadFS(pack); err == nil {
				t.Fatal("无效剧本配置未被拒绝")
			}
		})
	}
}
