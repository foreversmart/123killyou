package session

import "sync"

type commandLock struct {
	mu    sync.Mutex
	users int
}

// A transport retry shares the first request's result without making a second
// cloud call. Different requests still use the revision check at commit time.
func (s *Service) lockCommand(key string) func() {
	s.locksMu.Lock()
	if s.locks == nil {
		s.locks = make(map[string]*commandLock)
	}
	lock := s.locks[key]
	if lock == nil {
		lock = &commandLock{}
		s.locks[key] = lock
	}
	lock.users++
	s.locksMu.Unlock()
	lock.mu.Lock()
	return func() {
		s.locksMu.Lock()
		lock.mu.Unlock()
		lock.users--
		if lock.users == 0 {
			delete(s.locks, key)
		}
		s.locksMu.Unlock()
	}
}
