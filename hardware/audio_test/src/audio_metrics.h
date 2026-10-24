#pragma once

#include <stddef.h>
#include <stdint.h>

typedef struct {
    size_t frames;
    double sum[2];
    double squares[2];
    uint32_t peak[2];
    size_t nonzero[2];
} audio_metrics_t;

void audio_metrics_add(audio_metrics_t *metrics, const int32_t *stereo, size_t frames);
void audio_metrics_print(const char *label, const audio_metrics_t *metrics);
