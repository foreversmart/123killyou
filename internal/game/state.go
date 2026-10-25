package game

type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Image       string `json:"image"`
	Description string `json:"description"`
}

type Dialogue struct {
	Speaker  string `json:"speaker"`
	Text     string `json:"text"`
	Portrait string `json:"portrait"`
}

// SceneActor keeps the spatial staging of a story scene in the durable game
// state. The client can render the actor as a portrait, silhouette or text
// card when no art asset exists yet.
type SceneActor struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Role     string `json:"role"`
	Position string `json:"position"`
	Portrait string `json:"portrait"`
	Status   string `json:"status"`
	Visible  bool   `json:"visible"`
}

type Effect struct {
	Kind     string  `json:"kind"`
	Strength float64 `json:"strength"`
	Duration int     `json:"duration"`
}

type State struct {
	ID                   string       `json:"id"`
	RunID                string       `json:"runId"`
	SavedAt              string       `json:"savedAt"`
	Revision             int          `json:"revision"`
	StoryMode            bool         `json:"storyMode"`
	SceneKey             string       `json:"sceneKey"`
	ShotKey              string       `json:"shotKey"`
	DialogueNext         string       `json:"dialogueNext"`
	RetryScene           string       `json:"retryScene,omitempty"`
	SceneName            string       `json:"sceneName"`
	SceneText            string       `json:"sceneText"`
	SceneProps           []string     `json:"sceneProps"`
	Actors               []SceneActor `json:"actors"`
	Room                 string       `json:"room"`
	RoomName             string       `json:"roomName"`
	Devotion             int          `json:"devotion"`
	OracleSincerityScore int          `json:"oracleSincerityScore,omitempty"`
	// CandleUnlitTurns counts accepted actions while the red candle remains out.
	// It is persisted so repeated turns continue to lower devotion across saves.
	CandleUnlitTurns   int             `json:"candleUnlitTurns,omitempty"`
	GhostDialogueTurns int             `json:"ghostDialogueTurns,omitempty"`
	Inventory          []Item          `json:"inventory"`
	Clues              []string        `json:"clues"`
	Flags              map[string]bool `json:"flags"`
	Overlay            string          `json:"overlay"`
	FocusItem          string          `json:"focusItem"`
	Paused             bool            `json:"paused"`
	Caught             bool            `json:"caught"`
	Dialogue           Dialogue        `json:"dialogue"`
	LastHeard          string          `json:"lastHeard"`
	LastAction         string          `json:"lastAction"`
	Effect             Effect          `json:"effect"`
}

type Result struct {
	Type       string `json:"type"`
	RequestID  string `json:"requestId,omitempty"`
	State      State  `json:"state"`
	Speak      string `json:"speak,omitempty"`
	Intent     string `json:"intent,omitempty"`
	Error      string `json:"error,omitempty"`
	HasAudio   bool   `json:"hasAudio,omitempty"`
	VoiceError string `json:"voiceError,omitempty"`
	SpeakerID  string `json:"speakerId,omitempty"`
}

func Clone(state State) State {
	state.Inventory = append([]Item{}, state.Inventory...)
	state.Clues = append([]string{}, state.Clues...)
	state.SceneProps = append([]string{}, state.SceneProps...)
	state.Actors = append([]SceneActor{}, state.Actors...)
	flags := make(map[string]bool, len(state.Flags))
	for key, value := range state.Flags {
		flags[key] = value
	}
	state.Flags = flags
	return state
}
