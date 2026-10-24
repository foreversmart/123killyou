package game

import "nightwatch/internal/content"

func (e *Engine) give(state *State, text string) (string, string) {
	var npc content.NPC
	found := false
	for _, candidate := range e.content.NPCs() {
		if Has(text, append([]string{candidate.Name}, candidate.Aliases...)...) {
			npc = candidate
			found = true
			break
		}
	}
	if !found && Has(text, "他", "你") {
		npc, found = e.currentNPC(*state, text)
	}
	if !found {
		return "clarify", feedback(state, "你想把东西交给谁？请把物品和接收者一起告诉我。")
	}
	if npc.Room != state.Room {
		return "blocked", feedback(state, npc.Name+"不在这里。先回到他所在的房间，再把东西交给他。")
	}
	itemID := ""
	for _, item := range state.Inventory {
		if Has(text, item.Name) || (item.ID == "key" && Has(text, "钥匙")) {
			itemID = item.ID
			break
		}
	}
	if itemID == "" && Has(text, "这个", "这件") {
		itemID = state.FocusItem
	}
	if itemID == "" {
		for _, exchange := range npc.Exchanges {
			item, _ := e.content.Item(exchange.ItemID)
			if state.Flags[exchange.Flag] && (Has(text, item.Name) || (item.ID == "key" && Has(text, "钥匙"))) {
				return "blocked", feedback(state, item.Name+"已经交给"+npc.Name+"了。")
			}
		}
		return "clarify", feedback(state, "要交给"+npc.Name+"哪件物品？请说出物品名称。")
	}
	for _, exchange := range npc.Exchanges {
		if exchange.ItemID != itemID {
			continue
		}
		if state.Flags[exchange.Flag] {
			return "blocked", feedback(state, "这次交付已经完成。")
		}
		for index, item := range state.Inventory {
			if item.ID != itemID {
				continue
			}
			reward, _ := e.content.Item(exchange.RewardID)
			state.Inventory = append(state.Inventory[:index], state.Inventory[index+1:]...)
			state.Inventory = append(state.Inventory, Item(reward))
			state.Flags[exchange.Flag] = true
			clampDevotion(state, exchange.DevotionDelta)
			state.Clues = append(state.Clues, exchange.Clue)
			state.Overlay, state.FocusItem = "item", reward.ID
			return "give", reply(state, npc, exchange.Reply)
		}
		return "blocked", feedback(state, "你身上没有这件物品。")
	}
	return "blocked", reply(state, npc, npc.Reject)
}
