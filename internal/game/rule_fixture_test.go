package game

// ruleState isolates the original room-rule tests from the production story
// opening. New-game and story tests always use Engine.Initial directly.
func ruleState(engine *Engine, id string) State {
	world := engine.content.World()
	npc, _ := engine.content.NPC(world.InitialNPC)
	state := State{
		ID: id, Revision: 1, Room: world.InitialRoom, RoomName: world.InitialRoomName,
		Devotion: world.InitialDevotion, Inventory: []Item{}, Clues: []string{},
		SceneProps: []string{}, Actors: []SceneActor{},
		Flags: map[string]bool{}, Effect: Effect{Kind: "none"},
		Dialogue: Dialogue{Speaker: npc.Name, Text: npc.Intro, Portrait: npc.Portrait},
	}
	for _, id := range world.StartingItems {
		item, _ := engine.content.Item(id)
		state.Inventory = append(state.Inventory, Item(item))
	}
	return state
}
