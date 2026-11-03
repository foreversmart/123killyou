package jev

import (
	"context"
	"fmt"
	"strings"

	"nightwatch/internal/game"
)

func (c *Client) JudgeMeal(ctx context.Context, input game.MealJudgeRequest) (game.MealJudgeResult, error) {
	questions := make(map[string]question, len(input.Participants)*2)
	for _, participant := range input.Participants {
		instructions := fmt.Sprintf("判断%s是否被玩家说服而决定不吃肉粥。结合玩家原话、NPC性格、此前回应和当前场景；只在明确接受不吃且满足角色门槛时选择 refused，明确要吃时选择 ate，尚未被说服或信息不足时选择 deferred。NPC性格：%s；声音线索：%s；NPC此前回应：%s；当前选择：%s；含本次劝说次数：%d。", participant.Name, strings.Join(participant.Traits, "、"), participant.Voice, participant.LastReply, participant.MealChoice, participant.PersuasionAttempts)
		instructions += mealDifficultyInstructions(participant.ID)
		questions["meal_"+participant.ID] = question{
			Type: "choice", Instructions: instructions,
			Criteria: map[string]string{
				"refused":  "NPC接受劝说，明确不吃肉粥，且满足该角色的全部门槛。",
				"ate":      "NPC明确表示要吃、尝试或继续吃肉粥。",
				"deferred": "NPC尚未被说服，缺少必要次数、充分诚恳的内容或独立理由；等待玩家补充，不代表拒绝肉粥。",
			},
		}
		if participant.ID == "zhouyan" {
			questions["meal_zhouyan_sincerity"] = question{
				Type: "choice", Instructions: "只判断本次玩家原话是否充分而诚恳地劝周砚放弃肉粥。要有具体顾虑或依据、尊重对方自主选择的态度；机械重复、威胁、命令、堆字或自称诚恳不算。不要因为此前已劝过或只是出现寺庙/尊重等词就通过。",
				Criteria: map[string]string{"sincere": "内容有展开且诚恳，具体说明顾虑或依据并尊重周砚。", "insincere": "敷衍、命令、重复堆字、缺少具体解释，或无法确认诚意。"},
			}
		}
		if participant.ID == "xuzhi" {
			questions["meal_xuzhi_reasons"] = question{
				Type: "choice", Instructions: "只计算本次玩家原话向许栀提出的独立、具体、与放弃肉粥相关且有效的理由。不得累计此前回合，不把NPC话或玩家未说出的内容补为理由。相同顾虑的重复改写、机械编号、空泛口号或单纯要求服从不算新增理由。不同理由需要各自支持不喝肉粥；数字三或三遍命令不是三个理由。",
				Criteria: map[string]string{"zero": "没有独立有效理由。", "one": "只有一个独立有效理由。", "two": "只有两个独立有效理由。", "three_or_more": "至少三个不同、具体、有效的理由，足以说服许栀放弃肉粥。"},
			}
		}
	}
	state := fmt.Sprintf("场景：%s\n当前对白：%s\n玩家发言：%s\n此前问答：%s", input.Scene, input.Dialogue, input.PlayerText, input.History)
	out, err := c.call(ctx, request{Model: "jev-latest", State: state, Questions: questions})
	if err != nil {
		return game.MealJudgeResult{}, err
	}
	result := game.MealJudgeResult{Decisions: map[string]game.MealDecision{}}
	for _, participant := range input.Participants {
		item, ok := out.Answers["meal_"+participant.ID]
		if !ok || strings.TrimSpace(item.Choice) == "" {
			continue
		}
		reply := strings.TrimSpace(item.Reply)
		if reply == "" {
			reply = strings.TrimSpace(item.Text)
		}
		decision := game.MealDecision{Choice: item.Choice, Reply: reply, Confidence: item.Confidence}
		if participant.ID == "zhouyan" {
			sincerity := out.Answers["meal_zhouyan_sincerity"]
			decision.Sincere = sincerity.Choice == "sincere"
			decision.Confidence = min(decision.Confidence, sincerity.Confidence)
		}
		if participant.ID == "xuzhi" {
			reasons := out.Answers["meal_xuzhi_reasons"]
			decision.ReasonCount = map[string]int{"zero": 0, "one": 1, "two": 2, "three_or_more": 3}[reasons.Choice]
			decision.Confidence = min(decision.Confidence, reasons.Confidence)
		}
		result.Decisions[participant.ID] = decision
	}
	if len(result.Decisions) == 0 {
		return game.MealJudgeResult{}, fmt.Errorf("jev meal response contains no participant decisions")
	}
	return result, nil
}

func mealDifficultyInstructions(id string) string {
	switch id {
	case "linlan":
		return "林岚最容易说服，一次明确劝她不喝肉粥或改吃素食就会接受。"
	case "zhouyan":
		return "周砚至少需要两次明确劝说；即使第一遍很诚恳也不能接受。第二次起，本次原话须不少于40个有效文字、有充分展开且态度诚恳，不能是短句、重复命令或空泛客套。"
	case "xuzhi":
		return "许栀最难说服，本次原话必须举出至少三个不同、具体、有效的理由，并且这些理由确实能说服她放弃肉粥；只数序号、重复同一理由或累计前文都不合格。"
	default:
		return ""
	}
}
