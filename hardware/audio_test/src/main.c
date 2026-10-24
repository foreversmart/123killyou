#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include "audio_io.h"
#include "audio_metrics.h"
#include "driver/usb_serial_jtag.h"
#include "esp_err.h"
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static int16_t recording[AUDIO_RATE * AUDIO_SECONDS];
static size_t recorded;
static unsigned input_slot;

static void help(void)
{
    printf("AUDIO_TEST_READY rate=16000 bclk=4 ws=5 mic_data=6 amp_data=7\n");
    printf("COMMANDS b=two_quiet_beeps m=meters q=quiet r=record_3s "
           "p=play_recording 1=left_mic 2=right_mic h=help\n");
    printf("NOTE TX_DONE confirms data transmission only; audible sound needs human confirmation.\n");
}

static void record_voice(void)
{
    int32_t buffer[AUDIO_BLOCK * 2];
    audio_metrics_t metrics = {0};
    recorded = 0;
    printf("RECORD_START seconds=%d slot=%s speak_now=1\n", AUDIO_SECONDS,
           input_slot ? "right" : "left");
    int64_t deadline = esp_timer_get_time() + 5000000;
    while (recorded < AUDIO_RATE * AUDIO_SECONDS && esp_timer_get_time() < deadline) {
        size_t frames = 0;
        esp_err_t result = audio_read(buffer, AUDIO_BLOCK, &frames);
        if (result != ESP_OK) {
            printf("RECORD_ERROR error=%s\n", esp_err_to_name(result));
            recorded = 0;
            return;
        }
        size_t remaining = AUDIO_RATE * AUDIO_SECONDS - recorded;
        if (frames > remaining) frames = remaining;
        audio_metrics_add(&metrics, buffer, frames);
        for (size_t i = 0; i < frames; ++i) {
            recording[recorded++] = (int16_t)(buffer[i * 2 + input_slot] >> 16);
        }
    }
    if (recorded < AUDIO_RATE * AUDIO_SECONDS) {
        printf("RECORD_ERROR incomplete_frames=%u\n", (unsigned)recorded);
        recorded = 0;
        return;
    }
    audio_metrics_print("RECORD_DONE", &metrics);
    printf("RECORD_STORED frames=%u send_p_to_play=1\n", (unsigned)recorded);
}

static void command(char value, bool *meter)
{
    switch (value) {
    case 'b': {
        printf("TONE_START volume_percent=2\n");
        esp_err_t result = audio_beep();
        printf("TONE_DONE error=%s audible_confirmation_required=1\n", esp_err_to_name(result));
        break;
    }
    case 'm': *meter = true; printf("METER_ON speak_then_keep_quiet=1\n"); break;
    case 'q': *meter = false; printf("METER_OFF\n"); break;
    case 'r': record_voice(); break;
    case 'p': {
        printf("PLAY_START frames=%u\n", (unsigned)recorded);
        esp_err_t result = audio_play(recording, recorded);
        printf("PLAY_DONE error=%s audible_confirmation_required=1\n", esp_err_to_name(result));
        break;
    }
    case '1': input_slot = 0; printf("MIC_SLOT left\n"); break;
    case '2': input_slot = 1; printf("MIC_SLOT right\n"); break;
    case 'h': help(); break;
    case '\r': case '\n': case ' ': break;
    default: printf("UNKNOWN_COMMAND send_h_for_help=1\n"); break;
    }
}

void app_main(void)
{
    setvbuf(stdout, NULL, _IONBF, 0);
    usb_serial_jtag_driver_config_t usb = USB_SERIAL_JTAG_DRIVER_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(usb_serial_jtag_driver_install(&usb));
    esp_err_t result = audio_init();
    if (result != ESP_OK) {
        printf("AUDIO_INIT_ERROR error=%s\n", esp_err_to_name(result));
        return;
    }
    vTaskDelay(pdMS_TO_TICKS(1500));
    help();
    int32_t buffer[AUDIO_BLOCK * 2];
    audio_metrics_t metrics = {0};
    bool meter = false;
    int64_t last_report = esp_timer_get_time();
    while (true) {
        char value;
        if (usb_serial_jtag_read_bytes(&value, 1, 0) == 1) {
            command(value, &meter);
            memset(&metrics, 0, sizeof(metrics));
        }
        size_t frames = 0;
        result = audio_read(buffer, AUDIO_BLOCK, &frames);
        if (result != ESP_OK) {
            printf("I2S_READ_ERROR error=%s\n", esp_err_to_name(result));
            vTaskDelay(pdMS_TO_TICKS(500));
            continue;
        }
        audio_metrics_add(&metrics, buffer, frames);
        if (esp_timer_get_time() - last_report >= 500000) {
            if (meter) audio_metrics_print("MIC", &metrics);
            memset(&metrics, 0, sizeof(metrics));
            last_report = esp_timer_get_time();
        }
    }
}
