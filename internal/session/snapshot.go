package session

import (
	"encoding/json"
	"errors"

	"nightwatch/internal/game"
)

const StateVersion = 1
const StoryVersion = "prototype-v1"

var (
	ErrSession    = errors.New("会话不存在")
	ErrStaleRun   = errors.New("进度已切换，请基于当前场景重新说一次")
	ErrRequest    = errors.New("请求编号已用于其他内容")
	ErrSaveFormat = errors.New("开发存档结构与当前版本不一致，请使用新的开发数据库。")
)

func ValidateSnapshot(data Snapshot) error {
	if data.Version != StateVersion || data.StoryVersion != StoryVersion {
		return ErrSaveFormat
	}
	return nil
}
func EncodeState(state game.State) ([]byte, error) {
	state.Effect = game.Effect{Kind: "none"}
	return json.Marshal(Snapshot{StateVersion, StoryVersion, state})
}
func DecodeState(raw []byte) (game.State, error) {
	var data Snapshot
	if err := json.Unmarshal(raw, &data); err != nil {
		return game.State{}, err
	}
	if err := ValidateSnapshot(data); err != nil {
		return game.State{}, err
	}
	return data.State, nil
}
