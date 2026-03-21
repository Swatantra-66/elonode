package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	TeamContestModeICPC = "icpc_3v3"
	ICPCWrongPenaltyMin = 20
)

type TeamContest struct {
	ID          string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name        string    `gorm:"not null;index" json:"name"`
	Mode        string    `gorm:"not null;default:'icpc_3v3'" json:"mode"`
	TeamSize    int       `gorm:"not null;default:3" json:"team_size"`
	DurationSec int       `gorm:"not null;default:7200" json:"duration_sec"`
	StartedAt   time.Time `gorm:"not null;default:now()" json:"started_at"`
	Finalized   bool      `gorm:"not null;default:false;index" json:"finalized"`
	CreatedAt   time.Time `json:"created_at"`
}

func (TeamContest) TableName() string { return "team_contests" }

type TeamContestTeam struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ContestID  string    `gorm:"type:uuid;not null;index" json:"contest_id"`
	TeamName   string    `gorm:"type:text;not null" json:"team_name"`
	TeamNumber int       `gorm:"not null;index" json:"team_number"`
	CreatedAt  time.Time `json:"created_at"`
}

func (TeamContestTeam) TableName() string { return "team_contest_teams" }

type TeamContestMember struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	TeamID    string    `gorm:"type:uuid;not null;index" json:"team_id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	IsCaptain bool      `gorm:"not null;default:false" json:"is_captain"`
	CreatedAt time.Time `json:"created_at"`
}

func (TeamContestMember) TableName() string { return "team_contest_members" }

type TeamContestProblem struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ContestID   string    `gorm:"type:uuid;not null;index" json:"contest_id"`
	ProblemSlug string    `gorm:"type:text;not null;index" json:"problem_slug"`
	Position    int       `gorm:"not null" json:"position"`
	CreatedAt   time.Time `json:"created_at"`
}

func (TeamContestProblem) TableName() string { return "team_contest_problems" }

type TeamContestSubmission struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	ContestID   string    `gorm:"type:uuid;not null;index" json:"contest_id"`
	TeamID      string    `gorm:"type:uuid;not null;index" json:"team_id"`
	ProblemSlug string    `gorm:"type:text;not null;index" json:"problem_slug"`
	Verdict     string    `gorm:"type:text;not null" json:"verdict"`
	SubmittedAt time.Time `gorm:"not null;default:now();index" json:"submitted_at"`
	CreatedAt   time.Time `json:"created_at"`
}

func (TeamContestSubmission) TableName() string { return "team_contest_submissions" }

type TeamContestSideCreate struct {
	TeamName  string   `json:"team_name" binding:"required"`
	MemberIDs []string `json:"member_ids" binding:"required"`
	CaptainID string   `json:"captain_id" binding:"required"`
}

type TeamContestCreateRequest struct {
	Name         string                `json:"name" binding:"required"`
	Mode         string                `json:"mode"`
	DurationSec  int                   `json:"duration_sec"`
	TeamA        TeamContestSideCreate `json:"team_a" binding:"required"`
	TeamB        TeamContestSideCreate `json:"team_b" binding:"required"`
	ProblemSlugs []string              `json:"problem_slugs" binding:"required"`
}

type TeamContestSubmissionRequest struct {
	TeamID      string `json:"team_id" binding:"required"`
	ProblemSlug string `json:"problem_slug" binding:"required"`
	Verdict     string `json:"verdict" binding:"required"`
	SubmittedAt string `json:"submitted_at"`
}

type ICPCProblemScore struct {
	ProblemSlug      string `json:"problem_slug"`
	Solved           bool   `json:"solved"`
	WrongBeforeSolve int    `json:"wrong_before_solve"`
	SolvedAtMin      int    `json:"solved_at_min,omitempty"`
	Penalty          int    `json:"penalty"`
}

type ICPCTeamScore struct {
	Rank         int                `json:"rank"`
	TeamID       string             `json:"team_id"`
	TeamName     string             `json:"team_name"`
	TeamNumber   int                `json:"team_number"`
	Solved       int                `json:"solved"`
	Penalty      int                `json:"penalty"`
	LastSolvedAt int                `json:"last_solved_at"`
	Problems     []ICPCProblemScore `json:"problems"`
}

func (h *Handler) CreateTeamContest(c *gin.Context) {
	var req TeamContestCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.ProblemSlugs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one problem is required"})
		return
	}
	if req.DurationSec <= 0 {
		req.DurationSec = 2 * 60 * 60
	}
	if req.Mode == "" {
		req.Mode = TeamContestModeICPC
	}
	if req.Mode != TeamContestModeICPC {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported mode"})
		return
	}
	if err := validateTeamSide(req.TeamA); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team_a: " + err.Error()})
		return
	}
	if err := validateTeamSide(req.TeamB); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "team_b: " + err.Error()})
		return
	}

	seenUsers := make(map[string]bool, 6)
	for _, id := range append(req.TeamA.MemberIDs, req.TeamB.MemberIDs...) {
		if seenUsers[id] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "duplicate user across teams: " + id})
			return
		}
		seenUsers[id] = true
	}

	contest := TeamContest{
		Name:        req.Name,
		Mode:        req.Mode,
		TeamSize:    3,
		DurationSec: req.DurationSec,
		StartedAt:   time.Now().UTC(),
		Finalized:   false,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&contest).Error; err != nil {
			return err
		}

		teams := []TeamContestTeam{
			{ContestID: contest.ID, TeamName: req.TeamA.TeamName, TeamNumber: 1},
			{ContestID: contest.ID, TeamName: req.TeamB.TeamName, TeamNumber: 2},
		}
		if err := tx.Create(&teams).Error; err != nil {
			return err
		}

		for i, side := range []TeamContestSideCreate{req.TeamA, req.TeamB} {
			teamID := teams[i].ID
			for _, userID := range side.MemberIDs {
				member := TeamContestMember{
					TeamID:    teamID,
					UserID:    userID,
					IsCaptain: userID == side.CaptainID,
				}
				if err := tx.Create(&member).Error; err != nil {
					return err
				}
			}
		}

		for i, slug := range req.ProblemSlugs {
			p := TeamContestProblem{
				ContestID:   contest.ID,
				ProblemSlug: slug,
				Position:    i + 1,
			}
			if err := tx.Create(&p).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, contest)
}

func (h *Handler) GetTeamContest(c *gin.Context) {
	contestID := c.Param("id")
	var contest TeamContest
	if err := h.db.First(&contest, "id = ?", contestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "team contest not found"})
		return
	}

	var teams []TeamContestTeam
	if err := h.db.Where("contest_id = ?", contestID).Order("team_number asc").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var members []TeamContestMember
	if err := h.db.Where("team_id IN ?", extractTeamIDs(teams)).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var problems []TeamContestProblem
	if err := h.db.Where("contest_id = ?", contestID).Order("position asc").Find(&problems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"contest":  contest,
		"teams":    teams,
		"members":  members,
		"problems": problems,
	})
}

func (h *Handler) SubmitTeamContest(c *gin.Context) {
	contestID := c.Param("id")
	var req TeamContestSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var contest TeamContest
	if err := h.db.First(&contest, "id = ?", contestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "team contest not found"})
		return
	}
	if contest.Finalized {
		c.JSON(http.StatusConflict, gin.H{"error": "team contest already finalized"})
		return
	}

	var team TeamContestTeam
	if err := h.db.First(&team, "id = ? AND contest_id = ?", req.TeamID, contestID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid team for contest"})
		return
	}

	req.ProblemSlug = strings.TrimSpace(req.ProblemSlug)
	if req.ProblemSlug == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "problem_slug is required"})
		return
	}
	var problem TeamContestProblem
	if err := h.db.First(&problem, "contest_id = ? AND problem_slug = ?", contestID, req.ProblemSlug).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "problem not part of this contest"})
		return
	}

	verdict := strings.ToUpper(strings.TrimSpace(req.Verdict))
	allowed := map[string]bool{"AC": true, "WA": true, "TLE": true, "RE": true, "CE": true}
	if !allowed[verdict] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported verdict"})
		return
	}

	submittedAt := time.Now().UTC()
	if strings.TrimSpace(req.SubmittedAt) != "" {
		parsed, err := time.Parse(time.RFC3339, req.SubmittedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid submitted_at, use RFC3339"})
			return
		}
		submittedAt = parsed.UTC()
	}

	sub := TeamContestSubmission{
		ContestID:   contestID,
		TeamID:      req.TeamID,
		ProblemSlug: req.ProblemSlug,
		Verdict:     verdict,
		SubmittedAt: submittedAt,
	}
	if err := h.db.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, sub)
}

func (h *Handler) FinalizeTeamContest(c *gin.Context) {
	contestID := c.Param("id")
	if err := h.db.Model(&TeamContest{}).
		Where("id = ?", contestID).
		Update("finalized", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "team contest finalized", "contest_id": contestID})
}

func (h *Handler) GetTeamContestScoreboard(c *gin.Context) {
	contestID := c.Param("id")
	var contest TeamContest
	if err := h.db.First(&contest, "id = ?", contestID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "team contest not found"})
		return
	}

	var teams []TeamContestTeam
	if err := h.db.Where("contest_id = ?", contestID).Order("team_number asc").Find(&teams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var problems []TeamContestProblem
	if err := h.db.Where("contest_id = ?", contestID).Order("position asc").Find(&problems).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var subs []TeamContestSubmission
	if err := h.db.Where("contest_id = ?", contestID).Order("submitted_at asc").Find(&subs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	scoreboard := computeICPCScoreboard(contest.StartedAt, teams, problems, subs)
	c.JSON(http.StatusOK, gin.H{
		"contest_id": contestID,
		"mode":       contest.Mode,
		"scoreboard": scoreboard,
	})
}

func validateTeamSide(side TeamContestSideCreate) error {
	if len(side.MemberIDs) != 3 {
		return fmt.Errorf("must have exactly 3 members")
	}
	seen := make(map[string]bool, 3)
	foundCaptain := false
	for _, id := range side.MemberIDs {
		if strings.TrimSpace(id) == "" {
			return fmt.Errorf("member_ids contains empty id")
		}
		if seen[id] {
			return fmt.Errorf("duplicate member id: %s", id)
		}
		seen[id] = true
		if id == side.CaptainID {
			foundCaptain = true
		}
	}
	if !foundCaptain {
		return fmt.Errorf("captain_id must be included in member_ids")
	}
	return nil
}

func extractTeamIDs(teams []TeamContestTeam) []string {
	ids := make([]string, 0, len(teams))
	for _, t := range teams {
		ids = append(ids, t.ID)
	}
	return ids
}

func computeICPCScoreboard(startedAt time.Time, teams []TeamContestTeam, problems []TeamContestProblem, subs []TeamContestSubmission) []ICPCTeamScore {
	type pState struct {
		solved      bool
		wrongBefore int
		solvedAtMin int
	}

	problemSet := make(map[string]bool, len(problems))
	for _, p := range problems {
		problemSet[p.ProblemSlug] = true
	}

	teamStates := make(map[string]map[string]*pState, len(teams))
	for _, t := range teams {
		teamStates[t.ID] = make(map[string]*pState, len(problems))
		for _, p := range problems {
			teamStates[t.ID][p.ProblemSlug] = &pState{}
		}
	}

	sort.Slice(subs, func(i, j int) bool {
		return subs[i].SubmittedAt.Before(subs[j].SubmittedAt)
	})

	for _, s := range subs {
		if !problemSet[s.ProblemSlug] {
			continue
		}
		pMap, ok := teamStates[s.TeamID]
		if !ok {
			continue
		}
		st := pMap[s.ProblemSlug]
		if st.solved {
			continue
		}
		if s.Verdict == "AC" {
			st.solved = true
			mins := int(s.SubmittedAt.Sub(startedAt).Minutes())
			if mins < 0 {
				mins = 0
			}
			st.solvedAtMin = mins
		} else if s.Verdict != "CE" {
			st.wrongBefore++
		}
	}

	result := make([]ICPCTeamScore, 0, len(teams))
	for _, t := range teams {
		score := ICPCTeamScore{
			TeamID:       t.ID,
			TeamName:     t.TeamName,
			TeamNumber:   t.TeamNumber,
			Solved:       0,
			Penalty:      0,
			LastSolvedAt: 0,
			Problems:     make([]ICPCProblemScore, 0, len(problems)),
		}
		for _, p := range problems {
			st := teamStates[t.ID][p.ProblemSlug]
			item := ICPCProblemScore{
				ProblemSlug:      p.ProblemSlug,
				Solved:           st.solved,
				WrongBeforeSolve: st.wrongBefore,
				SolvedAtMin:      st.solvedAtMin,
				Penalty:          0,
			}
			if st.solved {
				item.Penalty = st.solvedAtMin + ICPCWrongPenaltyMin*st.wrongBefore
				score.Solved++
				score.Penalty += item.Penalty
				if st.solvedAtMin > score.LastSolvedAt {
					score.LastSolvedAt = st.solvedAtMin
				}
			}
			score.Problems = append(score.Problems, item)
		}
		result = append(result, score)
	}

	sort.Slice(result, func(i, j int) bool {
		if result[i].Solved != result[j].Solved {
			return result[i].Solved > result[j].Solved
		}
		if result[i].Penalty != result[j].Penalty {
			return result[i].Penalty < result[j].Penalty
		}
		return result[i].LastSolvedAt < result[j].LastSolvedAt
	})

	for i := range result {
		result[i].Rank = i + 1
	}

	return result
}

func EnsureUUID(id string) string {
	if strings.TrimSpace(id) == "" {
		return uuid.NewString()
	}
	return id
}
