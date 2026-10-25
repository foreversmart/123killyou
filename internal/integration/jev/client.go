// Package jev adapts TypeSafe's JEV System One endpoint to the story
// evaluator. It only classifies facts; the game package still owns all state
// changes and fallback rules.
package jev

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"nightwatch/internal/game"
)

const DefaultAPIBase = "https://api.typesafe.ai"

type Config struct {
	APIKey       string
	APIBase      string
	BaseURL      string
	RequestLimit time.Duration
	HTTPClient   *http.Client
}

type Client struct {
	config     Config
	httpClient *http.Client
}

func New(config Config) *Client {
	if strings.TrimSpace(config.APIBase) == "" {
		config.APIBase = config.BaseURL
	}
	if strings.TrimSpace(config.APIBase) == "" {
		config.APIBase = DefaultAPIBase
	}
	if config.RequestLimit <= 0 {
		config.RequestLimit = 8 * time.Second
	}
	client := config.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: config.RequestLimit}
	}
	return &Client{config: config, httpClient: client}
}

func (c *Client) Configured() bool { return c != nil && strings.TrimSpace(c.config.APIKey) != "" }

type question struct {
	Type         string `json:"type"`
	Instructions string `json:"instructions"`
	Criteria     any    `json:"criteria,omitempty"`
}

type request struct {
	Model     string              `json:"model"`
	State     string              `json:"state"`
	Questions map[string]question `json:"questions"`
}

type answer struct {
	Type          string             `json:"type"`
	Choice        string             `json:"choice"`
	Score         float64            `json:"score"`
	Noul          float64            `json:"noul"`
	Confidence    float64            `json:"confidence"`
	Probabilities map[string]float64 `json:"probabilities"`
	Reply         string             `json:"reply"`
	Text          string             `json:"text"`
}

type response struct {
	Answers map[string]answer `json:"answers"`
}

func (c *Client) call(ctx context.Context, body request) (response, error) {
	if !c.Configured() {
		return response{}, fmt.Errorf("jev api key is not configured")
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return response{}, err
	}
	endpoint := strings.TrimRight(c.config.APIBase, "/")
	if !strings.HasSuffix(endpoint, "/v1/systemone") {
		endpoint += "/v1/systemone"
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(string(raw)))
	if err != nil {
		return response{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.httpClient.Do(req)
	if err != nil {
		return response{}, fmt.Errorf("jev api request: %w", err)
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 2<<20))
	if err != nil {
		return response{}, fmt.Errorf("jev api response: %w", err)
	}
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return response{}, fmt.Errorf("jev api rejected request: %s", strings.TrimSpace(string(data)))
	}
	var out response
	if err := json.Unmarshal(data, &out); err != nil {
		return response{}, fmt.Errorf("jev api response: %w", err)
	}
	if len(out.Answers) == 0 {
		return response{}, fmt.Errorf("jev api response contains no answers")
	}
	return out, nil
}

func (c *Client) JudgeMeal(ctx context.Context, input game.MealJudgeRequest) (game.MealJudgeResult, error) {
	questions := make(map[string]question, len(input.Participants))
	for _, participant := range input.Participants {
		questions["meal_"+participant.ID] = question{
			Type:         "choice",
			Instructions: fmt.Sprintf("判断%s是否被玩家说服而决定不吃肉粥。结合玩家原话、NPC性格、性别/声音线索、此前回应和当前场景；只在明确接受不吃时选择 refused，明确要吃时选择 ate，犹豫或信息不足时选择 deferred。玩家原话：%s；NPC性格：%s；声音线索：%s；NPC此前回应：%s。", participant.Name, input.PlayerText, strings.Join(participant.Traits, "、"), participant.Voice, participant.LastReply),
			Criteria: map[string]string{
				"refused":  "NPC明确接受劝说，表示不吃肉粥或改吃素食。",
				"ate":      "NPC明确表示要吃、尝试或继续吃肉粥。",
				"deferred": "NPC没有作出明确决定，或玩家只是提问、信息不足。",
			},
		}
	}
	state := fmt.Sprintf("场景：%s\n当前对白：%s\n玩家发言：%s\n此前问答：%s\n参与者：%s", input.Scene, input.Dialogue, input.PlayerText, input.History, participantSummary(input.Participants))
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
		result.Decisions[participant.ID] = game.MealDecision{Choice: item.Choice, Reply: reply, Confidence: item.Confidence}
	}
	if len(result.Decisions) == 0 {
		return game.MealJudgeResult{}, fmt.Errorf("jev meal response contains no participant decisions")
	}
	return result, nil
}

func participantSummary(participants []game.MealParticipant) string {
	items := make([]string, 0, len(participants))
	for _, participant := range participants {
		items = append(items, participant.Name+"（"+strings.Join(participant.Traits, "、")+"；声音："+participant.Voice+"）")
	}
	return strings.Join(items, "、")
}

func (c *Client) JudgeOracle(ctx context.Context, input game.OracleJudgeRequest) (game.OracleJudgeResult, error) {
	state := fmt.Sprintf("场景：%s\n玩家当前虔诚度：%d\n玩家晚膳选择：%s\n玩家回答：%s\n此前问答：%s", input.Scene, input.Devotion, input.MealChoice, input.PlayerText, input.History)
	questions := map[string]question{
		"sincerity": {
			Type:         "choice",
			Instructions: "判断玩家回答神公关于红烛火苗的问题时是否虔诚、诚实并认真观察；不要因为玩家使用了宗教词汇就自动判定虔诚。",
			Criteria: map[string]string{
				"sincere":   "回答承认风和手的可能性，态度认真、克制、愿意观察。",
				"insincere": "敷衍、嘲弄、无所谓、拒绝回答，或明显不愿意观察。",
			},
		},
		"sincerity_score": {
			Type:         "score",
			Instructions: "按回答表现给玩家的虔诚程度评分。",
			Criteria:     []string{"完全敷衍或嘲弄。", "态度一般，无法确认。", "认真、诚实并愿意观察。"},
		},
	}
	out, err := c.call(ctx, request{Model: "jev-latest", State: state, Questions: questions})
	if err != nil {
		return game.OracleJudgeResult{}, err
	}
	choice, ok := out.Answers["sincerity"]
	if !ok {
		return game.OracleJudgeResult{}, fmt.Errorf("jev oracle response has no sincerity answer")
	}
	score := 0.0
	if item, exists := out.Answers["sincerity_score"]; exists {
		score = item.Score
		if score >= 0 && score <= 2 {
			score *= 50
		}
	}
	if score == 0 && choice.Choice == "sincere" {
		score = 100
	}
	return game.OracleJudgeResult{
		Sincere:    choice.Choice == "sincere" || choice.Noul >= 0.7,
		Score:      score,
		Confidence: choice.Confidence,
	}, nil
}

func (c *Client) JudgeOption(ctx context.Context, input game.OptionJudgeRequest) (game.OptionJudgeResult, error) {
	criteria := map[string]string{"none": "玩家发言与所有选项都不匹配，无法安全代选。"}
	for _, option := range input.Options {
		criteria[option.ID] = option.Description + "（执行命令：" + option.Command + "）"
	}
	questions := map[string]question{
		"option": {
			Type:         "choice",
			Instructions: "根据语音转写内容判断玩家想执行哪个当前选项。只能选择给出的选项 ID，若无法确定必须选择 none，不要创造新操作。",
			Criteria:     criteria,
		},
	}
	state := fmt.Sprintf("场景：%s\n当前对白：%s\n玩家语音转写：%s\n可选操作：%s", input.Scene, input.Dialogue, input.PlayerText, optionSummary(input.Options))
	out, err := c.call(ctx, request{Model: "jev-latest", State: state, Questions: questions})
	if err != nil {
		return game.OptionJudgeResult{}, err
	}
	answer, ok := out.Answers["option"]
	if !ok || strings.TrimSpace(answer.Choice) == "" {
		return game.OptionJudgeResult{}, fmt.Errorf("jev option response has no choice")
	}
	return game.OptionJudgeResult{Choice: strings.TrimSpace(answer.Choice), Confidence: answer.Confidence}, nil
}

func optionSummary(options []game.StoryOption) string {
	items := make([]string, 0, len(options))
	for _, option := range options {
		items = append(items, option.ID+"："+option.Description)
	}
	return strings.Join(items, "；")
}

func (c *Client) JudgeRoomAction(ctx context.Context, input game.RoomActionRequest) (game.RoomActionResult, error) {
	state := fmt.Sprintf("场景：%s\n镜头：%s\n当前画面：%s\n红烛已点燃：%t\n玩家原话：%s", input.Scene, input.Shot, input.SceneText, input.CandleLit, input.PlayerText)
	questions := map[string]question{
		"room_action": {
			Type:         "choice",
			Instructions: "只根据玩家原话在当前门房的四个可见操作中选择最接近的一项。再看烛火对应查看烛芯，寺史对应翻阅寺史，经书对应阅读大念处经，躺下或休息对应睡下。点燃红烛由本地明确命令处理；若玩家只是提问、同时提到多个选项、或无法判断，不要猜测，选择 unknown。",
			Criteria: map[string]string{
				string(game.RoomActionCandle):    "再看一眼烛火、查看烛芯或观察已经点燃的红烛。",
				string(game.RoomActionHistory):   "翻阅寺史、误识别为四史的寺庙历史册或历史册。",
				string(game.RoomActionScripture): "查看、阅读或翻开桌上的经书/经文。",
				string(game.RoomActionSleep):     "躺下、睡觉、闭眼或歇一会儿。",
				"unknown":                        "问题、闲聊、多个选项同时出现，或无法判断。",
			},
		},
	}
	out, err := c.call(ctx, request{Model: "jev-latest", State: state, Questions: questions})
	if err != nil {
		return game.RoomActionResult{}, err
	}
	answer, ok := out.Answers["room_action"]
	if !ok {
		return game.RoomActionResult{}, fmt.Errorf("jev room response has no action answer")
	}
	action := game.RoomAction(strings.ToLower(strings.TrimSpace(answer.Choice)))
	if action == "unknown" || !validRoomAction(action) {
		return game.RoomActionResult{}, fmt.Errorf("jev room response has invalid action %q", answer.Choice)
	}
	return game.RoomActionResult{Action: action, Confidence: answer.Confidence}, nil
}

func validRoomAction(action game.RoomAction) bool {
	switch action {
	case game.RoomActionCandle, game.RoomActionHistory, game.RoomActionScripture, game.RoomActionSleep:
		return true
	default:
		return false
	}
}
