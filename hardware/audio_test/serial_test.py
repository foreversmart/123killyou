"""Control only the local audio-test firmware; never flashes or resets the board."""

import argparse
import sys
import time

import serial
from serial.tools import list_ports


def select_port(explicit):
    if explicit:
        return explicit
    devices = [
        item.device
        for item in list_ports.comports()
        if item.vid == 0x303A and item.pid == 0x1001
    ]
    if len(devices) != 1:
        raise RuntimeError("未找到唯一的 ESP32 USB 串口，请用 --port 指定。")
    return devices[0]


def read_lines(connection, deadline):
    pending = bytearray()
    while time.monotonic() < deadline:
        data = connection.read(1024)
        if not data:
            continue
        pending.extend(data)
        while b"\n" in pending:
            line, _, rest = pending.partition(b"\n")
            pending = bytearray(rest)
            yield line.decode("utf-8", errors="replace").strip()
        if len(pending) > 8192:
            raise RuntimeError("串口返回异常数据，已停止发送测试指令。")


def main():
    parser = argparse.ArgumentParser(description="ESP32-S3 麦克风/功放本地测试")
    parser.add_argument("--port")
    parser.add_argument("--command", choices=["info", "tone", "meter", "record", "play"],
                        default="info")
    parser.add_argument("--seconds", type=float, default=10)
    parser.add_argument("--slot", choices=["left", "right"], default="left")
    args = parser.parse_args()
    if not 0 < args.seconds <= 600:
        parser.error("--seconds 必须大于 0 且不超过 600")

    port = select_port(args.port)
    connection = serial.Serial(port=None, baudrate=115200, timeout=0.1, write_timeout=2)
    connection.dtr = False
    connection.rts = False
    connection.port = port
    with connection:
        print(f"串口：{port}", flush=True)
        connection.reset_input_buffer()
        connection.write(b"h")
        identified = False
        for line in read_lines(connection, time.monotonic() + 5):
            print(line, flush=True)
            if line.startswith("AUDIO_TEST_READY "):
                identified = True
                break
        if not identified:
            raise RuntimeError("没有检测到音频测试固件；未继续发送音频指令。")
        if args.command == "info":
            return
        connection.write(b"q" + (b"1" if args.slot == "left" else b"2"))
        commands = {"tone": b"b", "meter": b"m", "record": b"r", "play": b"p"}
        connection.write(commands[args.command])
        timeout = args.seconds if args.command == "meter" else 8
        completion = {"tone": "TONE_DONE", "record": "RECORD_STORED", "play": "PLAY_DONE"}
        completed = False
        try:
            for line in read_lines(connection, time.monotonic() + timeout):
                print(line, flush=True)
                if "ERROR" in line or "error=" in line and "error=ESP_OK" not in line:
                    raise RuntimeError("设备返回错误，见上方日志。")
                if args.command == "meter" and line.startswith("MIC "):
                    completed = True
                elif line.startswith(completion.get(args.command, "\0")):
                    completed = True
                    break
        finally:
            connection.write(b"q")
        if not completed:
            raise RuntimeError("等待测试结果超时；尚不能确认设备正常。")
        if args.command in ["tone", "play"]:
            print("音频数据已发送；是否听到声音仍需人工确认。", flush=True)
        if args.command == "meter":
            print("需要比较安静/说话时的读数；非零读数本身不能证明麦克风正常。", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, serial.SerialException) as error:
        print(f"测试未完成：{error}", file=sys.stderr)
        sys.exit(1)
