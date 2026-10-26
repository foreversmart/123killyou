package game

// StoryOptionChoices is the server-side source of truth for buttons shown by
// the story UI. It is also the constrained set sent to JEV when ASR text does
// not match an option locally.
func StoryOptionChoices(state State) []StoryOption {
	if state.Flags["death_pending"] || state.Flags["sleep_pending"] ||
		state.Flags["three_knocks_dialogue_pending"] || state.Flags["escape_dialogue_pending"] ||
		state.Flags["escape_sleep_pending"] || state.Flags["dawn_knocks_dialogue_pending"] {
		return nil
	}
	option := func(id, command, description string) StoryOption {
		return StoryOption{ID: id, Command: command, Description: description}
	}
	switch state.SceneKey {
	case "mini_arrival":
		return []StoryOption{
			option("listen", "听第一话", "听完山门开场对白"),
			option("check_in", "登记入住", "登记姓名并领取房牌"),
		}
	case "mini_register":
		return []StoryOption{
			option("continue", "继续听", "继续入住对白"),
			option("refectory", "去斋堂吃晚膳", "前往斋堂"),
		}
	case "mini_refectory":
		return []StoryOption{
			option("player_refuse", "我拒绝吃肉粥", "主角不吃肉粥"),
			option("player_ate", "我吃肉粥", "主角吃肉粥"),
			option("persuade_all", "劝大家不要吃粥", "劝同伴改吃素食"),
			option("everyone_ate", "让所有人吃粥", "让所有人在场的人吃粥"),
			option("leave_meal", "吃完晚膳", "结束晚膳并回东院"),
		}
	case "mini_corridor_candle":
		return []StoryOption{
			option("take_candle", "拿红烛", "领取红烛"),
			option("continue", "继续听", "继续听回廊对白"),
			option("return_room", "回自己的房间", "回到门房"),
		}
	case "mini_room":
		choices := []StoryOption{
			option("candle", "点燃红烛", "点燃或查看红烛"),
			option("history", "查看寺庙历史", "查看寺史"),
			option("scripture", "阅读大念处经", "阅读经书"),
			option("sleep", "睡下", "躺下休息"),
		}
		if state.Flags["red_candle_lit"] {
			choices[0] = option("candle", "看烛芯", "查看红烛烛芯")
		}
		return choices
	case "mini_wake_three_gongs":
		return []StoryOption{
			option("relight", "续燃红烛", "重新点燃红烛"),
			option("stay_dark", "不续燃红烛", "保持红烛熄灭"),
		}
	case "mini_four_knocks":
		return []StoryOption{
			option("stay_silent", "不开门并问是谁", "隔门开口但不打开房门"),
			option("listen", "听敲门", "重听四敲"),
			option("open", "开门", "打开房门"),
		}
	case "mini_three_knocks":
		return []StoryOption{
			option("verify", "核对门外身份", "核对同行者私物"),
			option("listen", "跟同伴去偷听住持", "跟随同行者偷听"),
			option("stay_room", "留在房间", "留在房内观察"),
		}
	case "mini_listen":
		if !state.Flags["vase_broken"] {
			return []StoryOption{
				option("observe", "观察住持", "观察剥皮现场"),
				option("retreat", "退后", "后退并碰倒花瓶"),
			}
		}
		return []StoryOption{
			option("cat", "模仿猫叫", "模仿已听过的猫叫"),
			option("bird", "模仿鸟叫", "模仿已听过的鸟叫"),
			option("room", "跑回自己的房间并关门", "撤回门房"),
			option("oracle", "跑向大殿找神公", "跑向大殿求助"),
			option("wrong_way", "冲向后山", "冲向错误方向"),
		}
	case "mini_oracle":
		if state.ShotKey == "oracle_rescue" {
			return []StoryOption{option("return", "跟神公回房", "跟随引路红烛回房")}
		}
		if state.ShotKey == "oracle_cast" || state.ShotKey == "oracle_stone" {
			return []StoryOption{option("continue", "继续听", "继续观察杯筊或神公")}
		}
		return []StoryOption{
			option("ask_help", "救我，我想回自己的房间", "向神公求回门房"),
			option("cast", "掷杯筊", "投掷杯筊"),
		}
	case "mini_double":
		if state.Flags["double_calm"] {
			return []StoryOption{option("sleep", "睡下", "安静入睡")}
		}
		if state.Flags["double_frenzy"] || state.ShotKey == "double_frenzy" {
			return []StoryOption{
				option("close", "关上房门不跟出去", "拒绝跟随并关门"),
				option("follow", "跟出去", "跟随同行者出门"),
			}
		}
		return []StoryOption{
			option("keep_candle", "我不吹灭红烛", "拒绝熄灭红烛"),
			option("blow_candle", "吹灭红烛", "熄灭红烛"),
			option("scripture", "朗读大念处经", "朗读经文"),
		}
	case "mini_dawn_trap":
		if state.ShotKey == "escape_return" || state.ShotKey == "escape_outside" {
			return []StoryOption{
				option("sleep", "躺下睡觉", "躺下歇一会儿，等待下一段声音"),
				option("outside", "再去看看外面", "靠近门边再听一会儿"),
			}
		}
		return []StoryOption{
			option("wait", "不开门等待真正的五更", "留在房内等待天亮"),
			option("replay", "重听锣声和钟声", "重听更锣"),
			option("count_five", "把钟声算作第五声", "把假晓当作天亮"),
			option("open", "开门", "打开房门"),
		}
	case "mini_dawn":
		return []StoryOption{
			option("listen", "听天亮对白", "听同伴讲述昨夜经历"),
			option("ask_abbot", "询问住持去了哪里", "询问住持去向"),
			option("bus", "坐大巴回家", "上车离寺"),
		}
	case "mini_ending":
		return []StoryOption{
			option("journal", "查看手记", "查看这一夜的手记"),
			option("reset", "重新开始", "重新开始旅程"),
		}
	case "mini_death":
		return []StoryOption{
			option("retry", "从最近安全节点重试", "从安全节点重试"),
			option("reset", "重新开始", "从山门重新开始"),
		}
	default:
		return nil
	}
}
