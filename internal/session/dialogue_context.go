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
	context := fmt.Sprintf("当前事实：房间=%s；虔诚度=%d；持有物=%s；已知线索=%s；身份已暴露=%t。\n本轮后端结算倾向：%s\n请只以当前 NPC 的身份自然回应玩家，不宣称未被后端确认的奖励、移动或剧情。", state.RoomName, state.Devotion, strings.Join(items, "、"), clues, state.Caught, settledReply)
	if state.StoryMode {
		scene := state.SceneName
		if state.SceneKey == "mini_double" || state.SceneKey == "mini_listen" {
			scene = state.RoomName
		}
		context += fmt.Sprintf("\n当前场景=%s；眼前可见=%s；现场道具=%s；当前交谈者=%s。只回答这次发言，不复述上一句剧情台词，不把闲聊当成推进剧情的指令。不知道的事情明确说不知道；能理解的跑题先接话，只有确实听不懂时才询问玩家具体想问什么。不得改变当前时段、捏造现场的菜品或线索、揭示尚未发现的真相或编造人物经历。", scene, state.SceneText, strings.Join(state.SceneProps, "、"), state.Dialogue.Speaker)
		if state.SceneKey == "mini_double" {
			context += "\n仍以同行者的表面身份说话，不承认或解释任何隐藏身份，不要求玩家执行新的行动。"
		}
	}
	return context
}

func describeDialogueHistory(before game.State, npcID string, memories []Memory) string {
	var recent []string
	for index := len(memories) - 1; index >= 0 && len(recent) < 4; index-- {
		memory := memories[index]
		if memory.NPC == npcID {
			recent = append([]string{fmt.Sprintf("玩家：%s；你回应：%s", memory.Player, memory.Reply)}, recent...)
		}
	}
	history := "\n此前问答（仅供理解上下文，不能当作本轮答案）：" + strings.Join(recent, "\n")
	return history + fmt.Sprintf("\n上一句已播放的对白：%s：%s。若不确定这次发言的含义，请提出具体的澄清问题，禁止重复这句。", before.Dialogue.Speaker, before.Dialogue.Text)
}
