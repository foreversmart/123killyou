package game

func (e *Engine) movement(state *State, text string) (string, string, bool) {
	if Has(text, "去走廊", "到走廊", "前往走廊", "出门", "出去看看") {
		state.Room, state.RoomName, state.Overlay = "corridor", "走廊", ""
		state.Flags["visitedCorridor"] = true
		return "move", narrate(state, "油灯的光落在身后。左侧是值守室，前面通往内堂。走廊里没有人。"), true
	}
	if Has(text, "去值守室", "回值守室", "回到值守室", "返回值守室", "找守夜人", "去找守夜人") {
		state.Room, state.RoomName, state.Overlay = "watch", "值守室", ""
		return "move", e.returnToNPC(state), true
	}
	if Has(text, "去内堂", "到内堂", "打开内堂") {
		return "blocked", feedback(state, "内堂的门没有打开。先看看手头的线索。"), true
	}
	return "", "", false
}
