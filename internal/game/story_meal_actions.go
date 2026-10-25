package game

import "strings"

// Eating vegetables is not eating the story's meat porridge. A name or an
// isolated mention of food is also not consent to make a meal choice.
func miniMealChoice(text string) (string, bool) {
	if miniHasAny(text, "吗", "什么", "为什么", "怎么", "昨天", "刚才", "觉得", "喜欢", "能不能", "要不要", "是否", "如果", "假如", "听说") {
		return "", false
	}
	for _, name := range []string{"林岚", "周砚", "许栀"} {
		text = strings.ReplaceAll(text, name, "")
	}
	for {
		previous := text
		for _, prefix := range []string{"请", "让", "劝", "叫", "我", "决定"} {
			text = strings.TrimPrefix(text, prefix)
		}
		if text == previous {
			break
		}
	}
	if text == "暂缓" || text == "先等等" || text == "先不喝" || text == "暂缓吃粥" {
		return "deferred", true
	}
	vegetables := miniHasAny(text, "馒头", "咸菜", "素菜", "素食", "吃素", "笋干", "香菇青菜")
	porridge := miniHasAny(text, "粥", "肉")
	if vegetables && !porridge && (strings.HasPrefix(text, "吃") || strings.HasPrefix(text, "换")) {
		return "refused", true
	}
	for _, prefix := range []string{"不吃", "别吃", "不要吃", "拒绝", "不喝"} {
		if strings.HasPrefix(text, prefix) && (!vegetables || porridge) {
			return "refused", true
		}
	}
	for _, prefix := range []string{"吃", "喝", "尝"} {
		if strings.HasPrefix(text, prefix) && !vegetables && (porridge || text == prefix || text == "尝一口") {
			return "ate", true
		}
	}
	return "", false
}

func miniExactMealGroup(text string, commands ...string) bool {
	for _, command := range commands {
		if text == command || text == command+"粥" || text == command+"肉粥" {
			return true
		}
	}
	return false
}
