package game

import "strings"

func (e *Engine) system(state *State, text string) (string, string, bool) {
	if Has(text, "继续游戏", "恢复游戏", "继续吧") || text == "继续" {
		state.Paused = false
		return "resume", feedback(state, "已继续。你可以直接说出下一步行动。"), true
	}
	if state.Paused {
		return "paused", feedback(state, "游戏已暂停。说“继续游戏”即可回来。"), true
	}
	if Has(text, "暂停游戏", "暂停一下") || text == "暂停" {
		state.Paused = true
		return "pause", feedback(state, "游戏已暂停。我会等你说“继续游戏”。"), true
	}
	if state.Caught {
		return "caught", feedback(state, "你的身份已经暴露。说“重新开始”，可以重回这一夜。"), true
	}
	if (Has(text, "关掉", "关闭", "收起", "返回房间", "返回场景") && !Has(text, "声音", "静音")) || text == "返回" {
		state.Overlay, state.FocusItem = "", ""
		return "close", feedback(state, "已返回房间。"), true
	}
	if Has(text, "地图") && (Has(text, "看", "打开", "显示", "调出") || text == "地图") {
		state.Overlay = "map"
		return "map", feedback(state, "地图已展开。值守室与走廊相连，内堂暂时关闭。你可以说出要去的地方。"), true
	}
	if Has(text, "帮助", "怎么操作", "能做什么", "能说什么") {
		state.Overlay = "help"
		return "help", feedback(state, "你可以直接说：看看地图、去走廊、看看账本，或者把铜钥匙给守夜人。进度自动保存；说“保存为入堂前”建立检查点，说“回到入堂前”读取。说“返回”可收起界面。"), true
	}
	if Has(text, "设置", "关闭声音", "打开声音", "开启声音", "静音", "取消静音") {
		state.Overlay = "settings"
		return "settings", feedback(state, "你可以说“关闭声音”或“打开声音”。语音聆听会保持开启。"), true
	}
	if Has(text, "手记", "线索", "笔记") && !Has(text, "给", "交给") {
		state.Overlay = "journal"
		return "journal", feedback(state, "手记已展开。"+strings.Join(state.Clues, "。")), true
	}
	if Has(text, "看看我的东西", "查看背包", "打开背包", "随身物品", "物品栏", "道具栏", "我有什么") {
		state.Overlay = "inventory"
		return "inventory", feedback(state, "随身物品已展开。你可以说出要查看的物品名称。"), true
	}
	return "", "", false
}
