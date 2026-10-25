package game

func (e *Engine) grantStoryItems(state *State, ids ...string) {
	for _, id := range ids {
		found := false
		for _, item := range state.Inventory {
			if item.ID == id {
				found = true
				break
			}
		}
		if item, ok := e.content.Item(id); ok && !found {
			state.Inventory = append(state.Inventory, Item(item))
		}
	}
}
