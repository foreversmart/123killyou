package session

import (
	"fmt"
	"strings"

	"nightwatch/internal/game"
)

func describeDialogueContext(state game.State, settledReply string) string {
	if settledReply == "" {
		settledReply = "本轮未触发剧情事件，请自然回应这次发言。"
	}
	items := make([]string, 0, len(state.Inventory))
	for _, item := range state.Inventory {
		items = append(items, item.Name)
	}
	clues := strings.Join(state.Clues, "、")
	if clues == "" {
		clues = "无"
	}
	if len(items) == 0 {
		items = append(items, "无")
	}
	return fmt.Sprintf("当前事实：房间=%s；虔诚度=%d；持有物=%s；已知线索=%s；身份已暴露=%t。\n本轮后端结算倾向：%s\n请只以当前 NPC 的身份自然回应玩家，不宣称未被后端确认的奖励、移动或剧情。", state.RoomName, state.Devotion, strings.Join(items, "、"), clues, state.Caught, settledReply)
}
