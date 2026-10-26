package game

import (
	"regexp"
	"strings"
)

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
	vegetables := miniHasAny(text, "馒头", "咸菜", "素菜", "素材", "素食", "吃素", "笋干", "香菇青菜")
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

var miniMealFoodAction = regexp.MustCompile(`(不要|别|不)?(吃|喝|换)(?:一点|一些|点|些|成)?(肉粥|肉|粥|素菜|素材|素食|素|馒头|咸菜|笋干|香菇青菜)`)

// A reason may precede the food request. Read only the group's clause, and
// never turn a negated vegetable choice into a refusal of meat porridge.
func miniVegetarianGroupRequest(text string) bool {
	if !mealSpeechLooksLikeChoice(text) || miniHasAny(text, "不劝", "不要劝", "不用劝", "别劝", "不让", "不要让", "别让") {
		return false
	}
	if miniExactMealGroup(text, "劝大家不吃", "劝大家不要吃", "大家都不吃", "全都不吃", "让大家别吃", "让所有人不吃") {
		return true
	}
	for _, group := range []string{"大家", "所有人", "我们"} {
		index := strings.Index(text, group)
		if index < 0 {
			continue
		}
		request := text[index+len(group):]
		if index := miniPersonalMealIndex(request); index >= 0 {
			request = request[:index]
		}
		if miniHasAny(request, "不必", "不用", "没必要", "不一定", "不想", "无需") {
			continue
		}
		vegetarian := false
		for _, action := range miniMealFoodAction.FindAllStringSubmatch(request, -1) {
			negated := action[1] != ""
			meat := miniHasAny(action[3], "肉", "粥")
			if meat != negated {
				return false
			}
			vegetarian = true
		}
		if vegetarian {
			return true
		}
	}
	return false
}

func miniPersonalMealIndex(text string) int {
	for offset := 0; offset < len(text); {
		index := strings.Index(text[offset:], "我")
		if index < 0 {
			break
		}
		index += offset
		if !strings.HasPrefix(text[index:], "我们") {
			return index
		}
		offset = index + len("我们")
	}
	return -1
}

// Addressing the companions does not erase the player's own meal. A personal
// clause still permits an explicit change of mind; an undecided player shares
// the group's vegetarian meal by default.
func miniChooseGroupPlayerMeal(state *State, text string) {
	personalChoice := ""
	for offset := 0; offset < len(text); {
		index := miniPersonalMealIndex(text[offset:])
		if index < 0 {
			break
		}
		offset += index + len("我")
		request := text[offset:]
		for _, address := range []string{"大家", "所有人", "我们", "林岚", "周砚", "许栀", "我"} {
			if end := strings.Index(request, address); end >= 0 {
				request = request[:end]
			}
		}
		for _, prefix := range []string{"还是", "就", "先", "也", "要", "想"} {
			request = strings.TrimPrefix(request, prefix)
		}
		if choice, explicit := miniMealChoice(request); explicit {
			personalChoice = choice
		}
	}
	if personalChoice != "" {
		miniChooseMeal(state, "player", personalChoice)
	} else if mealChoiceName(*state, "player") == "unknown" {
		miniChooseMeal(state, "player", "refused")
	}
}
