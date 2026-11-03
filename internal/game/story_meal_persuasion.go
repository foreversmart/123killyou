package game

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

const mealPersuasionMinLength = 40

// MealPersuasionProgress is saved with the world so planning, retries and
// restored checkpoints cannot erase or double-count a companion's attempts.
type MealPersuasionProgress struct {
	Attempts int    `json:"attempts"`
	Reply    string `json:"reply,omitempty"`
}

func mealExplicitVegetarianAppeal(text string) bool {
	if mealReportedSpeech(text) || miniHasAny(text, "不劝", "不要劝", "不用劝", "别劝", "要不要", "能不能") || strings.HasPrefix(text, "如果") || strings.HasPrefix(text, "假如") {
		return false
	}
	return miniHasAny(text, "别吃", "不要吃", "别喝", "不要喝", "别碰", "不碰", "改吃", "换馒头", "换素菜", "还是吃素", "劝") &&
		miniHasAny(text, "粥", "肉", "馒头", "素菜", "素材", "吃素", "素食")
}

func mealPersuasionTargets(text string) []string {
	if miniPersonalMealOnly(text) || !mealSpeechLooksLikeChoice(text) || miniHasAny(text, "不劝", "不要劝", "不用劝", "别劝", "不让", "不要让", "别让") {
		return nil
	}
	group := miniVegetarianGroupRequest(text)
	choice, explicit := miniMealChoice(text)
	if !group && !(explicit && choice == "refused") && !mealExplicitVegetarianAppeal(text) {
		return nil
	}
	// An explicit meat request or a negated vegetarian request is not an
	// appeal to give up porridge, even if it contains the word "劝".
	if !group && !(explicit && choice == "refused") && !strings.Contains(text, "不碰") && !strings.Contains(text, "别碰") {
		vegetarian := false
		for _, action := range miniMealFoodAction.FindAllStringSubmatch(text, -1) {
			if miniHasAny(action[3], "肉", "粥") == (action[1] != "") {
				vegetarian = true
			}
		}
		if !vegetarian {
			return nil
		}
	}
	var targets []string
	for _, id := range []string{"linlan", "zhouyan", "xuzhi"} {
		if group || strings.Contains(text, miniPersonName(id)) {
			targets = append(targets, id)
		}
	}
	return targets
}

func (e *Engine) persuadeMealCompanions(state *State, text string, judged *MealJudgeResult) (string, string, bool) {
	targets := mealPersuasionTargets(text)
	if len(targets) == 0 {
		return "", "", false
	}
	if state.MealPersuasion == nil {
		state.MealPersuasion = map[string]MealPersuasionProgress{}
	}
	for _, id := range targets {
		progress := state.MealPersuasion[id]
		if state.Flags["meal_"+id+"_refused"] {
			progress.Reply = miniMealVegetarianConsentReply(id)
			state.MealPersuasion[id] = progress
			continue
		}
		progress.Attempts++
		result := MealDecision{}
		if judged != nil {
			result = judged.Decisions[id]
		}
		accepted := id == "linlan"
		if id == "zhouyan" {
			accepted = progress.Attempts >= 2 && utf8.RuneCountInString(Normalize(text)) >= mealPersuasionMinLength &&
				result.Sincere && validMealPersuasionDecision(result)
		} else if id == "xuzhi" {
			accepted = result.ReasonCount >= 3 && validMealPersuasionDecision(result)
		}
		if accepted {
			miniChooseMeal(state, id, "refused")
			miniSetFlag(state, "persuasion_success")
			progress.Reply = miniMealVegetarianConsentReply(id)
		} else {
			if mealChoiceName(*state, id) == "unknown" {
				miniChooseMeal(state, id, "deferred")
			}
			progress.Reply = mealPersuasionRetryReply(id, progress.Attempts, text, result)
		}
		state.MealPersuasion[id] = progress
	}
	waiting := false
	for id := range state.MealPersuasion {
		waiting = waiting || !state.Flags["meal_"+id+"_refused"]
	}
	state.Flags["meal_persuasion_waiting"] = waiting
	if waiting {
		delete(state.Flags, "refectory_eating_shown")
		delete(state.Flags, "refectory_meal_finished")
		miniShot(state, "refectory_table")
		miniSetFlag(state, "refectory_intro_done")
		miniSetFlag(state, "refectory_discussion_done")
	}
	if miniVegetarianGroupRequest(text) {
		miniChooseGroupPlayerMeal(state, text)
		return "story", e.startMealEatingGroup(state), true
	}
	if len(targets) > 1 {
		return "story", e.startMealGroupDialogue(state, targets), true
	}
	delete(state.Flags, "meal_group_pending")
	id := targets[0]
	if !waiting && state.Flags["meal_player_refused"] {
		return "story", e.startMealEating(state, miniPersonName(id), state.MealPersuasion[id].Reply), true
	}
	state.DialogueNext = nextMealDiscussion(state)
	return "story", miniDialogue(state, miniPersonName(id), state.MealPersuasion[id].Reply), true
}

func validMealPersuasionDecision(result MealDecision) bool {
	return normalizeMealDecision(result.Choice) == "refused" && result.Confidence >= .55
}

func mealPersuasionRetryReply(id string, attempts int, text string, result MealDecision) string {
	if id == "zhouyan" {
		if attempts < 2 {
			return "先别急着替我决定。你再认真劝我一次，把为什么不喝这碗粥讲具体些，我会听。"
		}
		if utf8.RuneCountInString(Normalize(text)) < mealPersuasionMinLength {
			return "这几句话还太简略。请耐心把顾虑和理由多讲一些，让我听明白你为什么坚持不喝。"
		}
		if result.Confidence < .55 || normalizeMealDecision(result.Choice) == "" {
			return "这次我还没能确认你的意思。请再认真说清顾虑，我还没有决定放弃这碗粥。"
		}
		return "我还没被说服。请诚恳地把具体顾虑和替代办法讲清楚，别只反复让我照做。"
	}
	if result.Confidence < .55 || normalizeMealDecision(result.Choice) == "" {
		return "这次我还没能确认你的理由。请再完整讲出至少三个不同、具体的理由，我还没有决定放弃肉粥。"
	}
	return "我还没决定放弃肉粥。请一次讲出至少三个不同、具体的理由，重复同一个顾虑可不算。"
}

func mealPersuasionWaitingReply(state *State) string {
	state.DialogueNext = ""
	return miniSystem(state, "同伴还在等你补充劝说理由。可以继续劝说，也可以说‘吃完晚膳’，按目前各自的选择收碗。")
}

// A reported instruction is not a new player request to change anyone's meal.
func mealReportedSpeech(text string) bool {
	return miniHasAny(text, "劝我", "昨天", "刚才", "听说", "为什么劝", "怎么劝", "如何劝")
}

var personalMealStart = regexp.MustCompile(`^我(?:还是|也|决定|就|先|要|想)*(?:改吃|换|吃|喝|尝|不吃|不喝|拒绝|暂缓)`)

func miniPersonalMealOnly(text string) bool {
	for {
		before := text
		for _, name := range []string{"林岚", "周砚", "许栀"} {
			text = strings.TrimPrefix(text, name)
		}
		if before == text {
			break
		}
	}
	if !personalMealStart.MatchString(text) || miniHasAny(text, "林岚", "周砚", "许栀", "大家", "所有人", "我们") {
		return false
	}
	_, explicit := miniMealChoice(text)
	return explicit
}
