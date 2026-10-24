#include "audio_io.h"

#include <math.h>
#include <stdlib.h>
#include "driver/gpio.h"
#include "driver/i2s_std.h"
#include "esp_check.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

static i2s_chan_handle_t tx;
static i2s_chan_handle_t rx;

esp_err_t audio_init(void)
{
    i2s_chan_config_t channel = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
    channel.auto_clear_after_cb = true;
    channel.dma_frame_num = AUDIO_BLOCK;
    channel.dma_desc_num = 4;
    ESP_RETURN_ON_ERROR(i2s_new_channel(&channel, &tx, &rx), "audio", "allocate");
    i2s_std_config_t config = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(AUDIO_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT,
                                                      I2S_SLOT_MODE_STEREO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = GPIO_NUM_4,
            .ws = GPIO_NUM_5,
            .dout = GPIO_NUM_7,
            .din = GPIO_NUM_6,
        },
    };
    ESP_RETURN_ON_ERROR(i2s_channel_init_std_mode(tx, &config), "audio", "TX setup");
    ESP_RETURN_ON_ERROR(i2s_channel_init_std_mode(rx, &config), "audio", "RX setup");
    ESP_RETURN_ON_ERROR(gpio_set_pull_mode(GPIO_NUM_6, GPIO_PULLDOWN_ONLY), "audio", "input bias");
    ESP_RETURN_ON_ERROR(i2s_channel_enable(tx), "audio", "TX start");
    return i2s_channel_enable(rx);
}

esp_err_t audio_read(int32_t *stereo, size_t capacity, size_t *frames)
{
    size_t bytes = 0;
    esp_err_t result = i2s_channel_read(rx, stereo, capacity * 8, &bytes, 200);
    *frames = bytes / 8;
    return result;
}

esp_err_t audio_write(const int32_t *stereo, size_t frames)
{
    const uint8_t *cursor = (const uint8_t *)stereo;
    size_t remaining = frames * 8;
    while (remaining) {
        size_t written = 0;
        esp_err_t result = i2s_channel_write(tx, cursor, remaining, &written, 1000);
        if (result != ESP_OK || written == 0) {
            return result == ESP_OK ? ESP_FAIL : result;
        }
        cursor += written;
        remaining -= written;
    }
    return ESP_OK;
}

static esp_err_t silence(void)
{
    int32_t zeros[AUDIO_BLOCK * 2] = {0};
    for (int i = 0; i < 8; ++i) {
        ESP_RETURN_ON_ERROR(audio_write(zeros, AUDIO_BLOCK), "audio", "silence");
    }
    vTaskDelay(pdMS_TO_TICKS(100));
    return ESP_OK;
}

static esp_err_t tone(float frequency)
{
    int32_t buffer[AUDIO_BLOCK * 2];
    const size_t length = AUDIO_RATE / 5;
    for (size_t start = 0; start < length; start += AUDIO_BLOCK) {
        size_t count = length - start;
        if (count > AUDIO_BLOCK) count = AUDIO_BLOCK;
        for (size_t i = 0; i < count; ++i) {
            size_t index = start + i;
            float fade = fminf(1.0f, fminf(index, length - index - 1) / 80.0f);
            float wave = sinf(6.2831853f * frequency * index / AUDIO_RATE);
            int32_t sample = (int32_t)(wave * fade * 0.02f * 2147483647.0f);
            buffer[i * 2] = sample;
            buffer[i * 2 + 1] = sample;
        }
        ESP_RETURN_ON_ERROR(audio_write(buffer, count), "audio", "tone");
    }
    return silence();
}

esp_err_t audio_beep(void)
{
    ESP_RETURN_ON_ERROR(tone(660.0f), "audio", "first beep");
    return tone(880.0f);
}

esp_err_t audio_play(const int16_t *mono, size_t frames)
{
    if (frames == 0) return ESP_ERR_INVALID_STATE;
    double sum = 0;
    for (size_t i = 0; i < frames; ++i) sum += mono[i];
    double mean = sum / frames;
    double peak = 0;
    for (size_t i = 0; i < frames; ++i) peak = fmax(peak, fabs(mono[i] - mean));
    if (peak < 2) return ESP_ERR_INVALID_STATE;
    // Remove DC; cap amplification and playback peaks to keep the first test quiet.
    double gain = fmin(16.0, 2500.0 / peak);
    int32_t buffer[AUDIO_BLOCK * 2];
    for (size_t start = 0; start < frames; start += AUDIO_BLOCK) {
        size_t count = frames - start;
        if (count > AUDIO_BLOCK) count = AUDIO_BLOCK;
        for (size_t i = 0; i < count; ++i) {
            int32_t sample = (int32_t)((mono[start + i] - mean) * gain * 65536.0);
            buffer[i * 2] = sample;
            buffer[i * 2 + 1] = sample;
        }
        ESP_RETURN_ON_ERROR(audio_write(buffer, count), "audio", "playback");
    }
    return silence();
}
