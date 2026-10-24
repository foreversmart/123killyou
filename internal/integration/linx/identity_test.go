package linx

import (
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func TestVirtualIdentityPersistsAcrossConcurrentStarts(t *testing.T) {
	path := filepath.Join(t.TempDir(), "linx", "device.json")
	identities := make(chan DeviceIdentity, 6)
	var workers sync.WaitGroup
	for range 6 {
		workers.Go(func() {
			identity, err := loadIdentity(path, "")
			if err != nil {
				t.Error(err)
				return
			}
			identities <- identity
		})
	}
	workers.Wait()
	close(identities)
	var first DeviceIdentity
	for identity := range identities {
		if !validIdentity(identity) {
			t.Fatal("invalid generated identity")
		}
		if first.DeviceID == "" {
			first = identity
		}
		if identity != first {
			t.Fatal("parallel starts generated different persisted identities")
		}
	}
	info, err := os.Stat(path)
	if err != nil || info.Mode().Perm() != 0600 {
		t.Fatal("identity must be private")
	}
	if _, err := loadIdentity(path, "00:11:22:33:44:55"); err == nil {
		t.Fatal("configuration must not replace persisted identity")
	}
}

func TestCorruptIdentityIsPreservedInsteadOfRegenerated(t *testing.T) {
	path := filepath.Join(t.TempDir(), "device.json")
	if err := os.WriteFile(path, []byte("broken"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := loadIdentity(path, ""); err == nil {
		t.Fatal("corrupt identity was silently replaced")
	}
	raw, _ := os.ReadFile(path)
	if string(raw) != "broken" {
		t.Fatal("corrupt file was overwritten")
	}
}
