package models

import (
	"time"
)

type Tier string

const (
	TierNewbie      Tier = "Newbie"
	TierApprentice  Tier = "Apprentice"
	TierSpecialist  Tier = "Specialist"
	TierExpert      Tier = "Expert"
	TierMaster      Tier = "Master"
	TierGrandmaster Tier = "Grandmaster"
)

type User struct {
	ID             string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name           string    `gorm:"not null;index" json:"name"`
	CurrentRating  int       `gorm:"default:1000" json:"current_rating"`
	MaxRating      int       `gorm:"default:1000" json:"max_rating"`
	ContestsPlayed int       `gorm:"default:0" json:"contests_played"`
	Tier           Tier      `gorm:"default:'Newbie'" json:"tier"`
	CreatedAt      time.Time `json:"created_at"`
}

// Contest represents a single competition event.
type Contest struct {
	ID                string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name              string    `gorm:"not null;index" json:"name"`
	Date              time.Time `json:"date"`
	TotalParticipants int       `gorm:"default:0" json:"total_participants"`
	Finalized         bool      `gorm:"default:false;index" json:"finalized"`
	CreatedAt         time.Time `json:"created_at"`
}

type RatingHistory struct {
	ID                uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID            string    `gorm:"type:uuid;not null;index" json:"user_id"`
	ContestID         string    `gorm:"type:uuid;not null;index" json:"contest_id"`
	ContestName       string    `gorm:"->;-:migration" json:"contest_name,omitempty"`
	OldRating         int       `json:"old_rating"`
	NewRating         int       `json:"new_rating"`
	PerformanceRating int       `json:"performance_rating"`
	Rank              int       `json:"rank"`
	TotalParticipants int       `json:"total_participants"`
	Percentile        float64   `json:"percentile"`
	RatingChange      int       `json:"rating_change"`
	CreatedAt         time.Time `json:"created_at"`

	User    *User    `gorm:"foreignKey:UserID" json:"-"`
	Contest *Contest `gorm:"foreignKey:ContestID" json:"-"`
}
