#pragma once

#include <stddef.h>
#include <stdint.h>
#include "esp_err.h"

enum { AUDIO_RATE = 16000, AUDIO_BLOCK = 256, AUDIO_SECONDS = 3 };

esp_err_t audio_init(void);
esp_err_t audio_read(int32_t *stereo, size_t capacity, size_t *frames);
esp_err_t audio_write(const int32_t *stereo, size_t frames);
esp_err_t audio_beep(void);
esp_err_t audio_play(const int16_t *mono, size_t frames);
