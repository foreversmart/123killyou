package session_test

import (
	"testing"

	"nightwatch/internal/content"
	"nightwatch/internal/game"
	"nightwatch/internal/session"
	"nightwatch/internal/storage/sqlite"
)

// seedRuleSave keeps dialogue-provider tests focused on the original room
// rules. Story startup tests exercise the unmodified public service methods.
func seedRuleSave(t *testing.T, repo *sqlite.Repository, service *session.Service, catalog *content.Catalog) {
	t.Helper()
	state, err := service.Create()
	if err != nil {
		t.Fatal(err)
	}
	world := catalog.World()
	npc, _ := catalog.NPC(world.InitialNPC)
	state = game.State{
		ID: state.ID, RunID: state.RunID, SavedAt: state.SavedAt, Revision: state.Revision,
		Room: world.InitialRoom, RoomName: world.InitialRoomName, Devotion: world.InitialDevotion,
		Inventory: []game.Item{}, Clues: []string{}, Flags: map[string]bool{},
		SceneProps: []string{}, Actors: []game.SceneActor{},
		Dialogue: game.Dialogue{Speaker: npc.Name, Text: npc.Intro, Portrait: npc.Portrait},
		Effect:   game.Effect{Kind: "none"},
	}
	for _, id := range world.StartingItems {
		item, _ := catalog.Item(id)
		state.Inventory = append(state.Inventory, game.Item(item))
	}
	if err := repo.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) }); err != nil {
		t.Fatal(err)
	}
}
