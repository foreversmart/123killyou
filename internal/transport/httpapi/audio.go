package httpapi

import (
	"encoding/binary"

	"github.com/gin-gonic/gin"
	"nightwatch/internal/session"
)

func (h handler) audio(c *gin.Context) {
	provider, ok := h.sessions.(interface {
		SpeechAudio(string, string, string) (session.DialogueAudio, bool)
	})
	if !ok {
		c.Status(404)
		return
	}
	audio, found := provider.SpeechAudio(c.Param("id"), c.Param("runId"), c.Param("requestId"))
	if !found {
		c.Status(404)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.Header("X-Content-Type-Options", "nosniff")
	c.Data(200, "audio/wav", wavAudio(audio))
}

func wavAudio(audio session.DialogueAudio) []byte {
	buffer := make([]byte, 44+len(audio.PCM))
	copy(buffer, "RIFF")
	binary.LittleEndian.PutUint32(buffer[4:], uint32(36+len(audio.PCM)))
	copy(buffer[8:], "WAVEfmt ")
	binary.LittleEndian.PutUint32(buffer[16:], 16)
	binary.LittleEndian.PutUint16(buffer[20:], 1)
	binary.LittleEndian.PutUint16(buffer[22:], 1)
	binary.LittleEndian.PutUint32(buffer[24:], uint32(audio.SampleRate))
	binary.LittleEndian.PutUint32(buffer[28:], uint32(audio.SampleRate*2))
	binary.LittleEndian.PutUint16(buffer[32:], 2)
	binary.LittleEndian.PutUint16(buffer[34:], 16)
	copy(buffer[36:], "data")
	binary.LittleEndian.PutUint32(buffer[40:], uint32(len(audio.PCM)))
	copy(buffer[44:], audio.PCM)
	return buffer
}
