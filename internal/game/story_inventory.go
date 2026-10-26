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

func (e *Engine) removeMiniItem(state *State, id string) {
	if state.FocusItem == id {
		state.Overlay, state.FocusItem = "", ""
	}
	for index, item := range state.Inventory {
		if item.ID == id {
			state.Inventory = append(state.Inventory[:index], state.Inventory[index+1:]...)
			return
		}
	}
}

func (e *Engine) returnMiniPermit(state *State) {
	miniSetFlag(state, "permit_returned")
	e.removeMiniItem(state, "permit")
}
