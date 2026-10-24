# ESP32-S3 本地音频测试

这个独立固件用于检查 ESP32-S3、I2S 数字麦克风和 MAX98357A 功放，
不连接 Wi-Fi 或灵矽，不修改游戏存档。板子启动后保持安静，只有收到串口命令才发声。

## 接线

修改接线时先拔掉 USB。这里按芯片 GPIO 编号接线，不按面包板行号。

| 模块      | 引脚     | ESP32-S3                  |
| --------- | -------- | ------------------------- |
| 麦克风    | VDD      | 3V3                       |
| 麦克风    | GND、L/R | GND                       |
| 麦克风    | SCK      | GPIO4                     |
| 麦克风    | WS       | GPIO5                     |
| 麦克风    | SD       | GPIO6                     |
| MAX98357A | VIN、SD  | 3V3                       |
| MAX98357A | GND      | GND                       |
| MAX98357A | BCLK     | GPIO4                     |
| MAX98357A | LRC      | GPIO5                     |
| MAX98357A | DIN      | GPIO7                     |
| MAX98357A | GAIN     | 不接                      |
| 喇叭      | 两根线   | 功放顶部绿色端子的 + 和 − |

**喇叭输出的 +、− 不是电源，不能接面包板电源轨或 GND。**
麦克风与功放共享时钟，分别使用不同的数据线；两块面包板需要共地。
电源轨上的红蓝标记不会自动产生电压，左右电源轨也不自动连通。

## 准备工具和构建

在项目根目录创建独立的 Python 虚拟环境，安装 PlatformIO 和串口工具。
首次构建会下载 ESP-IDF 及交叉编译器，工具缓存与备份存放在被 Git 忽略的 `.local/`。

```sh
python3 -m venv .local/hardware_tools
.local/hardware_tools/bin/pip install 'platformio==6.2.0' 'esptool==5.6.0'
export PLATFORMIO_CORE_DIR="$PWD/.local/platformio"
.local/hardware_tools/bin/pio run --project-dir hardware/audio_test
```

烧录会替换原有固件，所以应先完整备份。下面路径中的串口和备份文件名须按实际设备调整。
备份可能包含原设备配置，应只保存在本地。

```sh
mkdir -p .local/hardware_backups
.local/hardware_tools/bin/esptool --port /dev/cu.usbmodem3101 read-flash 0 ALL .local/hardware_backups/original.bin
.local/hardware_tools/bin/pio run --project-dir hardware/audio_test --target upload --upload-port /dev/cu.usbmodem3101
```

备份命令必须成功完成后才执行烧录，不要用空文件或读取失败的文件当作备份。
如需恢复，先核对备份属于当前设备，再执行：

```sh
.local/hardware_tools/bin/esptool --port /dev/cu.usbmodem3101 write-flash 0 .local/hardware_backups/original.bin
```

## 测试

下面的控制脚本会先确认设备运行的是本测试固件，不会烧录或主动复位板子。
有多个 ESP32 时加 `--port` 明确指定；只有一个设备时可省略。

```sh
.local/hardware_tools/bin/python hardware/audio_test/serial_test.py --command info
.local/hardware_tools/bin/python hardware/audio_test/serial_test.py --command tone
.local/hardware_tools/bin/python hardware/audio_test/serial_test.py --command meter --seconds 15
.local/hardware_tools/bin/python hardware/audio_test/serial_test.py --command record
.local/hardware_tools/bin/python hardware/audio_test/serial_test.py --command play
```

1. `tone` 发出两声低音量提示音，需人工确认是否真的听到。
2. `meter` 显示左右声道音量。先安静几秒，再近距离说话，比较 `L_rms` 和 `L_dbfs`。
   L/R 接 GND 时应主要观察左声道；读数应随说话明显变化。右声道活跃时先检查 L/R 接线，
   也可用 `--slot right` 检查右声道录音。
3. `record` 看到 `RECORD_START` 后说话，录音保存在 RAM 中，不写入 Flash；断电即丢失。
4. `play` 播放刚才的三秒录音，判断是否能听清自己的声音。

I2S 初始化和数据发送成功只能证明 ESP32 的控制器运行，不能证明外部模块在线。
全零、固定值、随机噪声或削波都不能直接判定麦克风通过；发送成功也不能判定喇叭已发声。
测试程序不具备检测短路、电压、喇叭阻抗或功放温度的能力。

底层使用 ESP-IDF 5.5 的 I2S 标准模式，全双工、16 kHz、双声道 32 位槽。
麦克风数据按 24 位左对齐解析，录音降为 16 位。播放去除直流偏置，限制增益与峰值。
