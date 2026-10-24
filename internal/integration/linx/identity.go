package linx

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
)

// DeviceIdentity belongs to this installation, not to a physical ESP32.
// Keep it outside version control. Replacing it requires binding a new device.
type DeviceIdentity struct {
	DeviceID string `json:"deviceId"`
	ClientID string `json:"clientId"`
}

func loadIdentity(path, configuredID string) (DeviceIdentity, error) {
	if raw, err := os.ReadFile(path); err == nil {
		var identity DeviceIdentity
		if json.Unmarshal(raw, &identity) != nil || !validIdentity(identity) {
			return identity, errors.New("linx identity file is invalid; preserve it and check its contents")
		}
		if configuredID != "" && !strings.EqualFold(configuredID, identity.DeviceID) {
			return identity, errors.New("LINX_DEVICE_ID differs from the persisted virtual device")
		}
		return identity, os.Chmod(path, 0600)
	} else if !os.IsNotExist(err) {
		return DeviceIdentity{}, err
	}
	var bytes [22]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return DeviceIdentity{}, err
	}
	bytes[0] = (bytes[0] | 2) & 0xfe // Locally administered, unicast MAC.
	bytes[12] = (bytes[12] & 0x0f) | 0x40
	bytes[14] = (bytes[14] & 0x3f) | 0x80
	identity := DeviceIdentity{
		DeviceID: strings.ToUpper(net.HardwareAddr(bytes[:6]).String()),
		ClientID: fmt.Sprintf("%x-%x-%x-%x-%x", bytes[6:10], bytes[10:12], bytes[12:14], bytes[14:16], bytes[16:22]),
	}
	if configuredID != "" {
		identity.DeviceID = configuredID
	}
	if !validIdentity(identity) {
		return identity, errors.New("LINX_DEVICE_ID must be a six-byte MAC address")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return identity, err
	}
	// Link a complete file atomically: concurrent starts never read partial JSON.
	file, err := os.CreateTemp(filepath.Dir(path), ".device-*")
	if err != nil {
		return identity, err
	}
	defer os.Remove(file.Name())
	err = json.NewEncoder(file).Encode(identity)
	closeErr := file.Close()
	if err != nil {
		return identity, err
	}
	if closeErr != nil {
		return identity, closeErr
	}
	if err := os.Link(file.Name(), path); os.IsExist(err) {
		return loadIdentity(path, configuredID)
	} else if err != nil {
		return identity, err
	}
	return identity, nil
}

func validIdentity(identity DeviceIdentity) bool {
	mac, err := net.ParseMAC(identity.DeviceID)
	if err != nil || len(mac) != 6 || len(identity.ClientID) != 36 {
		return false
	}
	for _, i := range []int{8, 13, 18, 23} {
		if identity.ClientID[i] != '-' {
			return false
		}
	}
	bytes, err := hex.DecodeString(strings.ReplaceAll(identity.ClientID, "-", ""))
	return err == nil && len(bytes) == 16 && bytes[6]>>4 == 4 && bytes[8]>>6 == 2
}
