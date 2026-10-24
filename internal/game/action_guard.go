package game

import "strings"

// ActionClarification is a conservative safeguard for the keyword demo, not an NLU model.
// Mentioning an action in a refusal, question or hypothetical must not execute it.
func ActionClarification(text string) (string, bool) {
	text = Normalize(text)
	// Checkpoint names are literal arguments; words inside a name are not instructions.
	for _, prefix := range []string{"保存为", "存档为", "保存检查点", "建立检查点", "读取检查点", "回到检查点", "读取存档", "回到存档", "读档", "回到"} {
		if strings.HasPrefix(text, prefix) {
			return "", false
		}
	}
	worldAction := Has(text, "去走廊", "到走廊", "前往走廊", "出门", "回休息室", "到休息室", "返回休息室", "找守夜人", "去内堂", "到内堂", "打开内堂", "给", "交付", "归还", "重新开始", "重来一遍", "重置游戏", "读取", "读档", "保存", "回到")
	anyAction := worldAction || Has(text, "打开", "关闭", "收起", "暂停", "继续", "静音", "地图", "账本", "登记册", "背包", "手记")
	if !anyAction {
		return "", false
	}
	if Has(text, "不要", "别", "不想", "不打算", "不去", "不回", "不给", "不交", "不归还", "不看", "不打开", "不关闭", "不暂停", "不继续", "不重", "先不", "暂时不", "不用", "不需要", "没说要") {
		return "明白，先保持当前状态。你可以继续交谈，或直接说出下一步行动。", true
	}
	if Has(text, "如果", "假如", "要是") || (worldAction && Has(text, "吗", "么", "是否", "能不能", "可不可以", "要不要", "会不会", "怎么", "为什么")) {
		return "这项行动还没有执行。要现在执行的话，请把要做的事再说完整。", true
	}
	if worldAction && Has(text, "他说", "她说", "你说", "他们说", "有人说") {
		return "你是在提到一项行动，还是希望现在执行？请把要做的事说完整。", true
	}
	return "", false
}
