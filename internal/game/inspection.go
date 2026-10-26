package game

func (e *Engine) inspection(state *State, text string) (string, string, bool) {
	if Has(text, "账本", "登记册", "登记簿", "桌上的本子") {
		if state.Room != "watch" {
			return "blocked", feedback(state, "账本还在休息室的桌上。"), true
		}
		state.Overlay = "ledger"
		if !state.Flags["ledgerSeen"] {
			state.Flags["ledgerSeen"] = true
			state.Clues = append(state.Clues, "登记册里有一行被划掉的名字；旁边写着：第三声钟响后，不可回头")
		}
		return "inspect", feedback(state, "一行名字被反复划掉，只留下旁边一行小字：第三声钟响后，不可回头。"), true
	}
	for _, item := range state.Inventory {
		if Has(text, item.Name) || (item.ID == "key" && Has(text, "钥匙")) {
			state.Overlay, state.FocusItem = "item", item.ID
			return "inspect", feedback(state, item.Description), true
		}
	}
	if Has(text, "看看房间", "环顾", "周围", "这里有什么", "观察房间") {
		if state.Room == "corridor" {
			return "look", feedback(state, "走廊左侧是亮着灯的休息室，右侧有一扇紧锁的门。尽头一盏灯笼轻轻晃着。"), true
		}
		return "look", feedback(state, "守夜人坐在桌后。桌上有登记册、油灯和茶杯，他身后的门通向走廊。"), true
	}
	if Has(text, "故障", "幻觉", "晕眩", "头晕") {
		kind := "glitch"
		if Has(text, "晕", "头晕") {
			kind = "dizzy"
		}
		state.Effect = Effect{Kind: kind, Strength: .7, Duration: 2800}
		return "effect", feedback(state, "灯光忽然不稳。你定了定神。"), true
	}
	return "", "", false
}
