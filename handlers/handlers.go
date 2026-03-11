package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"github.com/Swatantra-66/contest-rating-system/engine"
	"github.com/Swatantra-66/contest-rating-system/models"
)

type Handler struct {
	db *gorm.DB
}

type FinalizeParticipant struct {
	UserID string `json:"user_id"`
	Rank   int    `json:"rank"`
}

type WebhookPayload struct {
	Event       string `json:"event"`
	ContestID   string `json:"contest_id"`
	ContestName string `json:"contest_name"`
	WinnerID    string `json:"winner_id,omitempty"`
	LoserID     string `json:"loser_id,omitempty"`
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

func (h *Handler) GetContest(c *gin.Context) {
	var contest models.Contest
	if err := h.db.First(&contest, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "contest not found"})
		return
	}
	c.JSON(http.StatusOK, contest)
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
	Name     string `json:"name" binding:"required"`
	ImageURL string `json:"image_url"`
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req createUserReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	user := models.User{
		Name:          req.Name,
		ImageURL:      req.ImageURL,
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

func (h *Handler) CreateContest(c *gin.Context) {
	var input struct {
		Name              string `json:"name"`
		TotalParticipants int    `json:"total_participants"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request body"})
		return
	}

	participants := input.TotalParticipants
	if participants < 2 {
		participants = 2
	}

	newContest := models.Contest{
		Name:              input.Name,
		TotalParticipants: participants,
		Finalized:         false,
	}

	if err := h.db.Create(&newContest).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to generate contest node"})
		return
	}

	c.JSON(201, newContest)
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

	userIDs := make([]string, total)
	for i, entry := range entries {
		userIDs[i] = entry.UserID
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		var users []models.User
		if err := tx.Where("id IN ?", userIDs).Find(&users).Error; err != nil {
			return err
		}

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

	var winnerID, loserID string
	for _, entry := range entries {
		switch entry.Rank {
		case 1:
			winnerID = entry.UserID
		case 2:
			loserID = entry.UserID
		}
	}

	FireWebhook(WebhookPayload{
		Event:       "MATCH_FINALIZED",
		ContestID:   contestID,
		ContestName: contest.Name,
		WinnerID:    winnerID,
		LoserID:     loserID,
	})

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

func (h *Handler) GetContests(c *gin.Context) {
	var contests []map[string]interface{}
	if err := h.db.Table("contests").Order("created_at DESC").Find(&contests).Error; err != nil {
		c.JSON(500, gin.H{"error": "Could not fetch contests"})
		return
	}
	c.JSON(200, contests)
}

func (h *Handler) DeleteContest(c *gin.Context) {
	contestID := c.Param("id")

	adminKey := c.GetHeader("X-Admin-Key")
	expectedKey := os.Getenv("ADMIN_SECRET")

	if expectedKey == "" || adminKey != expectedKey {
		c.JSON(401, gin.H{"error": "unauthorized access: invalid security key"})
		return
	}

	var contest models.Contest
	contestName := "Unknown Contest"
	if err := h.db.Where("id = ?", contestID).First(&contest).Error; err == nil {
		contestName = contest.Name
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("contest_id = ?", contestID).Delete(&models.RatingHistory{}).Error; err != nil {
			return err
		}
		return tx.Where("id = ?", contestID).Delete(&models.Contest{}).Error
	})

	if err != nil {
		c.JSON(500, gin.H{"error": "failed to execute system purge protocol"})
		return
	}

	FireWebhook(WebhookPayload{
		Event:       "CONTEST_DELETED",
		ContestName: contestName,
		ContestID:   contestID,
	})

	c.JSON(200, gin.H{"message": "contest and associated logs purged"})
}

func FireWebhook(payload WebhookPayload) {
	webhookURL := os.Getenv("WEBHOOK_URL")
	if webhookURL == "" {
		fmt.Println("SYSTEM NOTE: WEBHOOK_URL not set. Skipping automation.")
		return
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Println("SYSTEM ERROR: Failed to marshal webhook payload:", err)
		return
	}

	go func() {
		resp, err := http.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			return
		}
		defer resp.Body.Close()
	}()
}

func (h *Handler) GetGlobalHistory(c *gin.Context) {
	var histories []models.RatingHistory
	if err := h.db.Order("created_at desc").Find(&histories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch global rating history"})
		return
	}
	c.JSON(http.StatusOK, histories)
}

func fetchRandomProblem(difficulty string) (*ProblemResponse, error) {
	lcDifficulty := strings.ToUpper(difficulty)

	listPayload := lcGraphQLRequest{
		Query: `
		query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
			problemsetQuestionList: questionList(
				categorySlug: $categorySlug
				limit: $limit
				skip: $skip
				filters: $filters
			) {
				questions: data {
					titleSlug
					title
					difficulty
				}
			}
		}`,
		Variables: map[string]interface{}{
			"categorySlug": "",
			"limit":        100,
			"skip":         0,
			"filters": map[string]interface{}{
				"difficulty": lcDifficulty,
			},
		},
	}

	listData, err := lcGraphQL(listPayload)
	if err != nil {
		return nil, err
	}

	var listResp lcProblemListResponse
	if err := json.Unmarshal(listData, &listResp); err != nil {
		return nil, err
	}

	questions := listResp.Data.ProblemsetQuestionList.Questions
	if len(questions) == 0 {
		return nil, fmt.Errorf("no problems found for difficulty: %s", difficulty)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	picked := questions[rng.Intn(len(questions))]

	detailPayload := lcGraphQLRequest{
		Query: `
		query problemDetail($titleSlug: String!) {
			question(titleSlug: $titleSlug) {
				title
				titleSlug
				difficulty
				content
				exampleTestcases
				codeSnippets {
					langSlug
					code
				}
				topicTags {
					name
				}
			}
		}`,
		Variables: map[string]interface{}{
			"titleSlug": picked.TitleSlug,
		},
	}

	detailData, err := lcGraphQL(detailPayload)
	if err != nil {
		return nil, err
	}

	var detailResp lcProblemDetailResponse
	if err := json.Unmarshal(detailData, &detailResp); err != nil {
		return nil, err
	}

	q := detailResp.Data.Question

	starterCode := "# Write your solution here\npass"
	for _, snippet := range q.CodeSnippets {
		if snippet.LangSlug == "python3" {
			starterCode = snippet.Code
			break
		}
	}

	tags := make([]string, 0, len(q.TopicTags))
	for _, t := range q.TopicTags {
		tags = append(tags, t.Name)
	}

	snippets := make([]CodeSnippet, 0, len(q.CodeSnippets))
	for _, s := range q.CodeSnippets {
		snippets = append(snippets, CodeSnippet{LangSlug: s.LangSlug, Code: s.Code})
	}

	return &ProblemResponse{
		Slug:         q.TitleSlug,
		Title:        q.Title,
		Difficulty:   q.Difficulty,
		Content:      q.Content,
		StarterCode:  starterCode,
		Examples:     q.ExampleTestcases,
		TimerSecs:    timerForDifficulty(q.Difficulty),
		Tags:         tags,
		LeetcodeURL:  fmt.Sprintf("https://leetcode.com/problems/%s/", q.TitleSlug),
		CodeSnippets: snippets,
	}, nil
}

func (h *Handler) GetRandomProblem(c *gin.Context) {
	difficulty := strings.ToLower(c.DefaultQuery("difficulty", "easy"))
	contestID := c.Query("contest_id")

	if contestID != "" {
		contestProblemCacheMu.RLock()
		cached, exists := contestProblemCache[contestID]
		contestProblemCacheMu.RUnlock()
		if exists {
			c.JSON(http.StatusOK, cached)
			return
		}
	}

	problem, err := fetchRandomProblem(difficulty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if contestID != "" {
		contestProblemCacheMu.Lock()
		contestProblemCache[contestID] = problem
		contestProblemCacheMu.Unlock()

		go func() {
			time.Sleep(2 * time.Hour)
			contestProblemCacheMu.Lock()
			delete(contestProblemCache, contestID)
			contestProblemCacheMu.Unlock()
		}()
	}

	c.JSON(http.StatusOK, problem)
}
