package sqlite

import (
	_ "embed"

	"nightwatch/internal/session"
)

//go:embed schema.sql
var initialSchema string

func (s *Repository) initializeSchema() error {
	var version int
	if err := s.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return err
	}
	if version > 1 {
		return session.ErrSaveFormat
	}
	if version == 1 {
		return nil
	}
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	_, err = tx.Exec(initialSchema)
	if err != nil {
		return err
	}
	return tx.Commit()
}
