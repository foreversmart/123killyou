package sqlite

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"net/url"
	"os"
	"path/filepath"
	"sync"

	_ "modernc.org/sqlite"
)

type Repository struct {
	mu sync.Mutex
	db *sql.DB
}

func newID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(err)
	}
	return hex.EncodeToString(b[:])
}
func Open(path string) (*Repository, error) {
	var dsn string
	if path == ":memory:" {
		dsn = "file:" + newID() + "?mode=memory&cache=shared"
	} else {
		absolute, err := filepath.Abs(path)
		if err != nil {
			return nil, err
		}
		if err := os.MkdirAll(filepath.Dir(absolute), 0700); err != nil {
			return nil, err
		}
		dsn = (&url.URL{Scheme: "file", Path: absolute}).String() + "?"
	}
	// Settings apply to replacement connections too.
	dsn += "&_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)&_pragma=synchronous(FULL)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	s := &Repository{db: db}
	if err := s.initializeSchema(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Repository) Close() error { return s.db.Close() }
