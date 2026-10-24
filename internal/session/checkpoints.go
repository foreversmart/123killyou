package session

import (
	"strings"
	"unicode"

	"nightwatch/internal/game"
)

func checkpointName(text string, prefixes ...string) (string, bool) {
	for _, prefix := range prefixes {
		if strings.HasPrefix(text, prefix) {
			name := strings.TrimFunc(strings.TrimPrefix(text, prefix), func(r rune) bool { return unicode.IsSpace(r) || unicode.IsPunct(r) })
			return name, true
		}
	}
	return "", false
}

func (s *Service) control(tx Transaction, next *game.State, before game.State, text string) (intent, speak string, handled bool, err error) {
	normalized := game.Normalize(text)
	respond := func(kind, message string) (string, string, bool, error) {
		return kind, feedback(next, message), true, nil
	}
	if message, clarify := game.ActionClarification(normalized); clarify {
		return respond("clarify", message)
	}
	if game.Has(normalized, "重新开始", "重来一遍", "重置游戏") {
		*next = s.engine.Initial(before.ID)
		err = s.fork(tx, next, before, nil, nil)
		next.LastHeard = text
		return "reset", feedback(next, "第一夜重新开始。原进度已保留，命名检查点仍可读取。"), true, err
	}
	if game.Has(normalized, "继续上次进度", "继续上次游戏", "恢复上次进度", "读取自动存档") {
		next.Paused = false
		return respond("resume_save", "已在最近的自动存档中。当前位置："+next.RoomName+"。")
	}
	if game.Has(normalized, "看看存档", "查看存档", "看看检查点", "列出检查点") {
		names, queryErr := tx.CheckpointNames(before.ID)
		if queryErr != nil {
			return "", "", true, queryErr
		}
		if len(names) == 0 {
			return respond("checkpoints", "进度已自动保存。还没有命名检查点，可以说“保存为入堂前”。")
		}
		return respond("checkpoints", "最近的检查点："+strings.Join(names, "、")+"。说“回到”加检查点名称即可读取。")
	}
	if name, ok := checkpointName(text, "保存为", "存档为", "保存检查点", "建立检查点"); ok {
		if name == "" || len([]rune(name)) > 24 {
			return respond("clarify", "请给检查点取一个不超过二十四字的名字，例如“保存为入堂前”。")
		}
		_, exists, queryErr := tx.Checkpoint(before.ID, name)
		if queryErr != nil {
			return "", "", true, queryErr
		}
		if exists {
			return respond("clarify", "已经有名为“"+name+"”的检查点，请换一个名字保存。")
		}
		memories, events, readErr := tx.Context(before.RunID)
		if readErr != nil {
			return "", "", true, readErr
		}
		before.Effect = game.Effect{Kind: "none"}
		data := Checkpoint{Snapshot{StateVersion, StoryVersion, before}, memories, events}
		err = tx.SaveCheckpoint(SavedCheckpoint{Name: name, SessionID: before.ID, SourceRun: before.RunID, CreatedAt: now(), Data: data})
		return "save_checkpoint", feedback(next, "已保存检查点“"+name+"”。说“回到"+name+"”可以读取。"), true, err
	}
	name, loading := checkpointName(text, "读取检查点", "回到检查点", "读取存档", "回到存档", "读档", "回到")
	roomMovement := normalized == "回到值守室" || normalized == "回到走廊" || normalized == "回到内堂"
	if loading && !roomMovement {
		if name == "" {
			return respond("clarify", "请说出要读取的检查点名称。说“看看存档”可以查看已有名称。")
		}
		saved, exists, readErr := tx.Checkpoint(before.ID, name)
		if readErr != nil {
			return "", "", true, readErr
		}
		if !exists {
			return respond("clarify", "没有找到检查点“"+name+"”。说“看看存档”查看已有名称。")
		}
		data := saved.Data
		if err := ValidateSnapshot(data.Snapshot); err != nil {
			return "", "", true, err
		}
		*next = data.Snapshot.State
		err = s.fork(tx, next, before, data.Memories, data.Events)
		next.LastHeard = text
		return "load_checkpoint", feedback(next, "已回到检查点“"+name+"”。当前位置："+next.RoomName+"。"), true, err
	}
	if normalized == "保存游戏" || normalized == "存档" {
		return respond("save", "当前进度已保存。也可以说“保存为”加一个名字建立检查点。")
	}
	return "", "", false, nil
}
