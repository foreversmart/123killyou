package sqlite

import (
	"nightwatch/internal/game"
	"nightwatch/internal/session"
)

// Create explicitly seeds the room-rule test fixture. Production startup tests
// call Service.Create and Service.Resume without this wrapper.
func (s *fixture) Create() (game.State, error) {
	state, err := s.Service.Create()
	if err != nil {
		return state, err
	}
	world := s.catalog.World()
	npc, _ := s.catalog.NPC(world.InitialNPC)
	state = game.State{
		ID: state.ID, RunID: state.RunID, SavedAt: state.SavedAt, Revision: state.Revision,
		Room: world.InitialRoom, RoomName: world.InitialRoomName, Devotion: world.InitialDevotion,
		Inventory: []game.Item{}, Clues: []string{}, Flags: map[string]bool{},
		SceneProps: []string{}, Actors: []game.SceneActor{},
		Dialogue: game.Dialogue{Speaker: npc.Name, Text: npc.Intro, Portrait: npc.Portrait},
		Effect:   game.Effect{Kind: "none"},
	}
	for _, id := range world.StartingItems {
		item, _ := s.catalog.Item(id)
		state.Inventory = append(state.Inventory, game.Item(item))
	}
	err = s.repository.Transaction(func(tx session.Transaction) error { return tx.SaveState(state) })
	return state, err
}
