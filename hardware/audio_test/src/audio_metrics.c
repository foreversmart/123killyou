#include "audio_metrics.h"

#include <inttypes.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>

void audio_metrics_add(audio_metrics_t *metrics, const int32_t *stereo, size_t frames)
{
    for (size_t i = 0; i < frames; ++i) {
        for (size_t channel = 0; channel < 2; ++channel) {
            // INMP441 supplies signed 24-bit samples, left aligned in a 32-bit slot.
            int32_t value = stereo[i * 2 + channel] >> 8;
            metrics->sum[channel] += value;
            metrics->squares[channel] += (double)value * value;
            uint32_t magnitude = (uint32_t)abs(value);
            if (magnitude > metrics->peak[channel]) metrics->peak[channel] = magnitude;
            if (value != 0) ++metrics->nonzero[channel];
        }
    }
    metrics->frames += frames;
}

void audio_metrics_print(const char *label, const audio_metrics_t *metrics)
{
    printf("%s frames=%u", label, (unsigned)metrics->frames);
    for (size_t channel = 0; channel < 2; ++channel) {
        double count = metrics->frames ? metrics->frames : 1;
        double mean = metrics->sum[channel] / count;
        double variance = fmax(0, metrics->squares[channel] / count - mean * mean);
        double rms = sqrt(variance);
        double dbfs = rms > 0 ? 20 * log10(rms / 8388608.0) : -160;
        printf(" %c_rms=%.1f %c_dbfs=%.1f %c_peak=%" PRIu32 " %c_nonzero=%u",
               channel ? 'R' : 'L', rms, channel ? 'R' : 'L', dbfs,
               channel ? 'R' : 'L', metrics->peak[channel], channel ? 'R' : 'L',
               (unsigned)metrics->nonzero[channel]);
    }
    printf("\n");
}
