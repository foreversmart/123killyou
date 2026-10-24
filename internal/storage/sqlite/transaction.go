package sqlite

import (
	"database/sql"

	"nightwatch/internal/session"
)

type transaction struct{ tx *sql.Tx }

var _ session.Repository = (*Repository)(nil)
var _ session.Transaction = transaction{}

func (r *Repository) Transaction(fn func(session.Transaction) error) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := fn(transaction{tx}); err != nil {
		return err
	}
	return tx.Commit()
}
