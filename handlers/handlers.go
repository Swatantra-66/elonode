package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/Swatantra-66/contest-rating-system/engine"
	"github.com/Swatantra-66/contest-rating-system/models"
)

type Handler struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Handler {
	return &Handler{db: db}
}

func (h *Handler) GetUser(c *gin.Context) {
	var user models.User
	if err := h.db.First(&user, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *Handler) GetUsers(c *gin.Context) {
	var users []models.User

	if err := h.db.Order("current_rating desc").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch users"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *Handler) GetRatingHistory(c *gin.Context) {
	type historyRow struct {
		models.RatingHistory
		ContestName string `json:"contest_name"`
	}

	var rows []historyRow
	err := h.db.
		Table("rating_histories rh").
		Select("rh.*, c.name AS contest_name").
		Joins("JOIN contests c ON c.id = rh.contest_id").
		Where("rh.user_id = ?", c.Param("id")).
		Order("rh.created_at ASC").
		Scan(&rows).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rows)
}

type createUserReq struct {
	Name string `json:"name" binding:"required"`
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req createUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := models.User{
		Name:          req.Name,
		CurrentRating: 1000,
		MaxRating:     1000,
		Tier:          models.TierNewbie,
	}
	if err := h.db.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

type createContestReq struct {
	Name string `json:"name" binding:"required"`
	Date string `json:"date"`
}

func (h *Handler) CreateContest(c *gin.Context) {
	var req createContestReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	date := time.Now()
	if req.Date != "" {
		if t, err := time.Parse(time.RFC3339, req.Date); err == nil {
			date = t
		}
	}
	contest := models.Contest{Name: req.Name, Date: date}
	if err := h.db.Create(&contest).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, contest)
}

type participantEntry struct {
	UserID string `json:"user_id" binding:"required"`
	Rank   int    `json:"rank"    binding:"required,min=1"`
}

func (h *Handler) FinalizeContest(c *gin.Context) {
	contestID := c.Param("id")

	var contest models.Contest
	if err := h.db.First(&contest, "id = ?", contestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contest not found"})
		return
	}
	if contest.Finalized {
		c.JSON(http.StatusConflict, gin.H{"error": "contest already finalized"})
		return
	}

	var entries []participantEntry
	if err := c.ShouldBindJSON(&entries); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	total := len(entries)
	if total == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no participants provided"})
		return
	}

	//Extract all User IDs for bulk fetching
	userIDs := make([]string, total)
	for i, entry := range entries {
		userIDs[i] = entry.UserID
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var users []models.User
		if err := tx.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
			return err
		}

		//create a map for O(1) lookups
		userMap := make(map[string]*models.User)
		for i := range users {
			userMap[fmt.Sprint(users[i].ID)] = &users[i]
		}

		var histories []models.RatingHistory

		for _, entry := range entries {
			user, exists := userMap[entry.UserID]
			if !exists {
				return fmt.Errorf("user %s not found", entry.UserID)
			}

			result, err := engine.Calculate(entry.Rank, total, user.CurrentRating)
			if err != nil {
				return fmt.Errorf("calculation failed for user %s: %w", entry.UserID, err)
			}

			histories = append(histories, models.RatingHistory{
				UserID:            user.ID,
				ContestID:         contestID,
				OldRating:         user.CurrentRating,
				NewRating:         result.NewRating,
				PerformanceRating: result.PerformanceRating,
				Rank:              entry.Rank,
				TotalParticipants: total,
				Percentile:        result.Percentile,
				RatingChange:      result.RatingChange,
			})

			user.CurrentRating = result.NewRating
			user.Tier = result.NewTier
			user.ContestsPlayed++
			if result.NewRating > user.MaxRating {
				user.MaxRating = result.NewRating
			}
		}

		if err := tx.Create(&histories).Error; err != nil {
			return err
		}

		for _, user := range users {
			if err := tx.Save(&user).Error; err != nil {
				return err
			}
		}

		return tx.Model(&contest).Updates(map[string]interface{}{
			"finalized":          true,
			"total_participants": total,
		}).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":            "contest finalized",
		"contest_id":         contestID,
		"total_participants": total,
	})
}

func (h *Handler) GetHealth(c *gin.Context) {
	sqlDB, err := h.db.DB()
	if err != nil || sqlDB.Ping() != nil {
		c.JSON(500, gin.H{"status": "offline"})
		return
	}
	c.JSON(200, gin.H{"status": "connected"})
}

func (h *Handler) GetStats(c *gin.Context) {
	var count int64
	var avgElo float64
	var activeContests int64

	h.db.Table("users").Count(&count)

	h.db.Table("users").Select("AVG(current_rating)").Row().Scan(&avgElo)

	h.db.Table("contests").Count(&activeContests)

	c.JSON(200, gin.H{
		"total_nodes":     count,
		"average_elo":     int(avgElo),
		"active_contests": activeContests,
	})
}
