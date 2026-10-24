package game

func (e *Engine) movement(state *State, text string) (string, string, bool) {
	if Has(text, "去走廊", "到走廊", "前往走廊", "出门", "出去看看") {
		state.Room, state.RoomName = "corridor", "走廊"
		state.Overlay, state.FocusItem = "", ""
		state.Flags["visitedCorridor"] = true
		return "move", feedback(state, "油灯的光落在身后。左侧是休息室，前面通往内堂。走廊里没有人。"), true
	}
	if Has(text, "去休息室", "回休息室", "回到休息室", "返回休息室", "找守夜人", "去找守夜人") {
		fromPanel := state.Overlay != ""
		state.Room, state.RoomName = "watch", "休息室"
		state.Overlay, state.FocusItem = "", ""
		if fromPanel {
			return "move", feedback(state, "已收起面板，来到休息室。你可以继续调查，或与这里的人交谈。"), true
		}
		return "move", e.returnToNPC(state), true
	}
	if Has(text, "去内堂", "到内堂", "打开内堂") {
		return "blocked", feedback(state, "内堂的门没有打开。先看看手头的线索。"), true
	}
	return "", "", false
}
