package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type TestCase struct {
	ID             string `gorm:"type:uuid;primaryKey"`
	ProblemSlug    string `gorm:"type:text"`
	InputData      string `gorm:"type:text"`
	ExpectedOutput string `gorm:"type:text"`
	IsHidden       bool   `gorm:"type:boolean"`
	CheckerType    string `gorm:"type:text"`
	FloatTolerance float64
}

type SubmitRequest struct {
	Code        string `json:"code" binding:"required"`
	LanguageID  int    `json:"language_id" binding:"required"`
	ProblemSlug string `json:"problem_slug" binding:"required"`
	Action      string `json:"action" binding:"required"`
}

type Judge0Request struct {
	SourceCode     string `json:"source_code"`
	LanguageID     int    `json:"language_id"`
	Stdin          string `json:"stdin"`
	ExpectedOutput string `json:"expected_output"`
	CPUTimeLimit   int    `json:"cpu_time_limit,omitempty"`
	WallTimeLimit  int    `json:"wall_time_limit,omitempty"`
	MemoryLimitKB  int    `json:"memory_limit,omitempty"`
}

type Judge0Response struct {
	Token         string `json:"token"`
	Stdout        string `json:"stdout"`
	Stderr        string `json:"stderr"`
	CompileOutput string `json:"compile_output"`
	Message       string `json:"message"`
	Time          string `json:"time"`
	Memory        int    `json:"memory"`
	Status        struct {
		ID          int    `json:"id"`
		Description string `json:"description"`
	} `json:"status"`
}

type Judge0CreateResponse struct {
	Token string `json:"token"`
}

type CaseResult struct {
	CaseIndex       int    `json:"case_index"`
	Verdict         string `json:"verdict"`
	Checker         string `json:"checker"`
	StatusID        int    `json:"status_id"`
	Status          string `json:"status"`
	Passed          bool   `json:"passed"`
	Time            string `json:"time,omitempty"`
	MemoryKB        int    `json:"memory_kb,omitempty"`
	Hidden          bool   `json:"hidden"`
	Input           string `json:"input,omitempty"`
	ExpectedOutput  string `json:"expected_output,omitempty"`
	ActualOutput    string `json:"actual_output,omitempty"`
	ExecutionDetail string `json:"execution_detail,omitempty"`
}

type JudgeSummary struct {
	PassedCases   int     `json:"passed_cases"`
	TotalCases    int     `json:"total_cases"`
	AvgTimeMs     float64 `json:"avg_time_ms"`
	MaxTimeMs     float64 `json:"max_time_ms"`
	MaxMemoryKB   int     `json:"max_memory_kb"`
	TotalMemoryKB int     `json:"total_memory_kb"`
}

type JudgeLimits struct {
	CPUTimeLimit  int
	WallTimeLimit int
	MemoryLimitKB int
}

const judge0PollInterval = 250 * time.Millisecond
const judge0PollTimeout = 30 * time.Second
const judge0MaxCreateRetries = 2

const (
	defaultCPUTimeLimit   = 2
	defaultWallTimeLimit  = 6
	defaultMemoryLimitKB  = 256000
	defaultFloatTolerance = 1e-6
)

func SubmitCodeHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req SubmitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request payload"})
			return
		}

		action := strings.ToLower(strings.TrimSpace(req.Action))
		if action != "run" && action != "submit" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "action must be either 'run' or 'submit'"})
			return
		}

		query := db.Where("problem_slug = ?", req.ProblemSlug)
		if action == "run" {
			query = query.Where("is_hidden = ?", false)
		}

		var testCases []TestCase
		if err := query.Find(&testCases).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch test cases"})
			return
		}

		if len(testCases) == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "No test cases found in database"})
			return
		}

		httpClient := &http.Client{Timeout: 20 * time.Second}
		results := make([]CaseResult, 0, len(testCases))
		timeMsTotal := 0.0
		timeMsMax := 0.0
		memoryTotal := 0
		memoryMax := 0

		for i, tc := range testCases {
			limits := limitsForLanguage(req.LanguageID)
			judgeReq := Judge0Request{
				SourceCode:     req.Code,
				LanguageID:     req.LanguageID,
				Stdin:          tc.InputData,
				ExpectedOutput: tc.ExpectedOutput,
				CPUTimeLimit:   limits.CPUTimeLimit,
				WallTimeLimit:  limits.WallTimeLimit,
				MemoryLimitKB:  limits.MemoryLimitKB,
			}

			judgeResp, err := createAndAwaitJudgeResult(httpClient, judgeReq)
			if err != nil {
				c.JSON(http.StatusBadGateway, gin.H{
					"error":   "Judge0 request failed",
					"details": err.Error(),
				})
				return
			}

			actualOut := judgeResp.Stdout
			expectedOut := tc.ExpectedOutput
			checkerType := resolvedCheckerType(tc.CheckerType)
			matchedOutput := outputsMatchWithChecker(actualOut, expectedOut, checkerType, tc.FloatTolerance)
			passed := judgeResp.Status.ID == 3 && matchedOutput
			verdict := deriveVerdict(judgeResp.Status.ID, matchedOutput)
			discloseCaseDetails := !tc.IsHidden

			execDetail := strings.TrimSpace(strings.Join([]string{
				judgeResp.Message,
				judgeResp.Stderr,
				judgeResp.CompileOutput,
			}, "\n"))

			caseResult := CaseResult{
				CaseIndex: i + 1,
				Verdict:   verdict,
				Checker:   checkerType,
				StatusID:  judgeResp.Status.ID,
				Status:    judgeResp.Status.Description,
				Passed:    passed,
				Time:      judgeResp.Time,
				MemoryKB:  judgeResp.Memory,
				Hidden:    tc.IsHidden,
			}
			if discloseCaseDetails {
				caseResult.Input = tc.InputData
				caseResult.ExpectedOutput = normalizeOutput(expectedOut)
				caseResult.ActualOutput = normalizeOutput(actualOut)
				caseResult.ExecutionDetail = execDetail
			}
			results = append(results, caseResult)
			curTimeMs := timeToMilliseconds(judgeResp.Time)
			timeMsTotal += curTimeMs
			if curTimeMs > timeMsMax {
				timeMsMax = curTimeMs
			}
			memoryTotal += judgeResp.Memory
			if judgeResp.Memory > memoryMax {
				memoryMax = judgeResp.Memory
			}

			if passed {
				continue
			}

			if tc.IsHidden {
				c.JSON(http.StatusOK, gin.H{
					"status":            "Failed",
					"verdict":           verdict,
					"message":           fmt.Sprintf("Failed on Hidden Test Case #%d", i+1),
					"failed_case_index": i + 1,
					"results":           results,
					"summary":           buildJudgeSummary(results, timeMsTotal, timeMsMax, memoryTotal, memoryMax),
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"status":            "Failed",
				"verdict":           verdict,
				"message":           fmt.Sprintf("Failed on Public Test Case #%d", i+1),
				"failed_case_index": i + 1,
				"input":             tc.InputData,
				"expected_output":   normalizeOutput(expectedOut),
				"actual_output":     normalizeOutput(actualOut),
				"error":             execDetail,
				"results":           results,
				"summary":           buildJudgeSummary(results, timeMsTotal, timeMsMax, memoryTotal, memoryMax),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":       "Accepted",
			"verdict":      "Accepted",
			"message":      "Success!",
			"passed_cases": len(results),
			"total_cases":  len(testCases),
			"results":      results,
			"summary":      buildJudgeSummary(results, timeMsTotal, timeMsMax, memoryTotal, memoryMax),
		})
	}
}

func outputsMatch(actual, expected string) bool {
	return outputsMatchWithChecker(actual, expected, "standard", defaultFloatTolerance)
}

func outputsMatchWithChecker(actual, expected, checkerType string, floatTolerance float64) bool {
	normalizedActual := normalizeOutput(actual)
	normalizedExpected := normalizeOutput(expected)

	switch checkerType {
	case "exact":
		return normalizedActual == normalizedExpected
	case "token":
		return tokensEqual(normalizedActual, normalizedExpected)
	case "float":
		return floatTokensEqual(normalizedActual, normalizedExpected, resolvedTolerance(floatTolerance))
	case "unordered_lines":
		return unorderedLinesEqual(normalizedActual, normalizedExpected)
	default:
		if normalizedActual == normalizedExpected {
			return true
		}
		if tokensEqual(normalizedActual, normalizedExpected) {
			return true
		}
		return floatTokensEqual(normalizedActual, normalizedExpected, resolvedTolerance(floatTolerance))
	}
}

func tokensEqual(actual, expected string) bool {
	actualTokens := strings.Fields(actual)
	expectedTokens := strings.Fields(expected)
	if len(actualTokens) != len(expectedTokens) {
		return false
	}

	for i := range actualTokens {
		if actualTokens[i] != expectedTokens[i] {
			return false
		}
	}

	return true
}

func floatTokensEqual(actual, expected string, tolerance float64) bool {
	actualTokens := strings.Fields(actual)
	expectedTokens := strings.Fields(expected)
	if len(actualTokens) != len(expectedTokens) {
		return false
	}

	for i := range actualTokens {
		a := actualTokens[i]
		e := expectedTokens[i]
		if a == e {
			continue
		}

		af, aErr := strconv.ParseFloat(a, 64)
		ef, eErr := strconv.ParseFloat(e, 64)
		if aErr != nil || eErr != nil {
			return false
		}

		diff := math.Abs(af - ef)
		allowed := math.Max(tolerance, tolerance*math.Max(math.Abs(af), math.Abs(ef)))
		if diff > allowed {
			return false
		}
	}

	return true
}

func unorderedLinesEqual(actual, expected string) bool {
	actualLines := strings.Split(actual, "\n")
	expectedLines := strings.Split(expected, "\n")

	if len(actualLines) == 1 && actualLines[0] == "" {
		actualLines = []string{}
	}
	if len(expectedLines) == 1 && expectedLines[0] == "" {
		expectedLines = []string{}
	}

	if len(actualLines) != len(expectedLines) {
		return false
	}

	lineCounts := make(map[string]int, len(actualLines))
	for _, line := range actualLines {
		lineCounts[line]++
	}
	for _, line := range expectedLines {
		lineCounts[line]--
		if lineCounts[line] < 0 {
			return false
		}
	}
	for _, count := range lineCounts {
		if count != 0 {
			return false
		}
	}

	return true
}

func resolvedCheckerType(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "exact", "token", "float", "unordered_lines", "standard":
		return strings.ToLower(strings.TrimSpace(raw))
	default:
		return "standard"
	}
}

func resolvedTolerance(v float64) float64 {
	if v <= 0 {
		return defaultFloatTolerance
	}
	return v
}

func normalizeOutput(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	lines := strings.Split(s, "\n")
	for i := range lines {
		lines[i] = strings.TrimRight(lines[i], " \t")
	}
	for len(lines) > 0 && lines[len(lines)-1] == "" {
		lines = lines[:len(lines)-1]
	}
	return strings.Join(lines, "\n")
}

func deriveVerdict(statusID int, matchedOutput bool) string {
	switch statusID {
	case 3:
		if matchedOutput {
			return "Accepted"
		}
		return "Wrong Answer"
	case 4:
		return "Wrong Answer"
	case 5:
		return "Time Limit Exceeded"
	case 6:
		return "Compile Error"
	case 7, 8, 9, 10, 11, 12, 14:
		return "Runtime Error"
	default:
		return "Internal Error"
	}
}

func limitsForLanguage(languageID int) JudgeLimits {
	limits := JudgeLimits{
		CPUTimeLimit:  defaultCPUTimeLimit,
		WallTimeLimit: defaultWallTimeLimit,
		MemoryLimitKB: defaultMemoryLimitKB,
	}

	switch languageID {
	case 71: // Python
		limits.CPUTimeLimit = 3
		limits.WallTimeLimit = 8
	case 74: // TypeScript
		limits.CPUTimeLimit = 3
		limits.WallTimeLimit = 8
	case 63: // JavaScript
		limits.CPUTimeLimit = 3
		limits.WallTimeLimit = 8
	case 62: // Java
		limits.CPUTimeLimit = 3
		limits.WallTimeLimit = 8
		limits.MemoryLimitKB = 384000
	}

	return limits
}

func createAndAwaitJudgeResult(client *http.Client, req Judge0Request) (Judge0Response, error) {
	token, err := createJudgeSubmissionWithRetry(client, req)
	if err != nil {
		return Judge0Response{}, err
	}

	return pollJudgeSubmission(client, token)
}

func judge0BaseURL() string {
	base := strings.TrimSpace(os.Getenv("JUDGE0_BASE_URL"))
	if base == "" {
		base = "https://ce.judge0.com/submissions"
	}
	return strings.TrimRight(base, "/")
}

func createJudgeSubmissionWithRetry(client *http.Client, req Judge0Request) (string, error) {
	payloadBytes, _ := json.Marshal(req)
	url := judge0BaseURL() + "?base64_encoded=false&wait=false"

	var lastErr error
	for attempt := 0; attempt <= judge0MaxCreateRetries; attempt++ {
		resp, err := client.Post(url, "application/json", bytes.NewBuffer(payloadBytes))
		if err != nil {
			lastErr = err
		} else {
			bodyBytes, _ := io.ReadAll(resp.Body)
			_ = resp.Body.Close()
			if resp.StatusCode >= 400 {
				lastErr = fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(bodyBytes)))
			} else {
				var createResp Judge0CreateResponse
				if err := json.Unmarshal(bodyBytes, &createResp); err != nil {
					lastErr = fmt.Errorf("invalid create response: %s", string(bodyBytes))
				} else if strings.TrimSpace(createResp.Token) == "" {
					lastErr = fmt.Errorf("missing token in create response")
				} else {
					return createResp.Token, nil
				}
			}
		}

		if attempt < judge0MaxCreateRetries {
			time.Sleep(time.Duration(attempt+1) * 200 * time.Millisecond)
		}
	}

	return "", lastErr
}

func pollJudgeSubmission(client *http.Client, token string) (Judge0Response, error) {
	url := fmt.Sprintf("%s/%s?base64_encoded=false", judge0BaseURL(), token)
	deadline := time.Now().Add(judge0PollTimeout)

	for time.Now().Before(deadline) {
		resp, err := client.Get(url)
		if err != nil {
			time.Sleep(judge0PollInterval)
			continue
		}

		bodyBytes, _ := io.ReadAll(resp.Body)
		_ = resp.Body.Close()
		if resp.StatusCode >= 400 {
			return Judge0Response{}, fmt.Errorf("poll status %d: %s", resp.StatusCode, strings.TrimSpace(string(bodyBytes)))
		}

		var judgeResp Judge0Response
		if err := json.Unmarshal(bodyBytes, &judgeResp); err != nil {
			return Judge0Response{}, fmt.Errorf("invalid poll response: %s", string(bodyBytes))
		}
		if judgeResp.Status.ID != 1 && judgeResp.Status.ID != 2 {
			return judgeResp, nil
		}

		time.Sleep(judge0PollInterval)
	}

	return Judge0Response{}, fmt.Errorf("judge timed out while polling token %s", token)
}

func timeToMilliseconds(seconds string) float64 {
	if strings.TrimSpace(seconds) == "" {
		return 0
	}
	v, err := strconv.ParseFloat(strings.TrimSpace(seconds), 64)
	if err != nil {
		return 0
	}
	return v * 1000.0
}

func buildJudgeSummary(results []CaseResult, timeMsTotal, timeMsMax float64, memoryTotal, memoryMax int) JudgeSummary {
	passed := 0
	for _, r := range results {
		if r.Passed {
			passed++
		}
	}

	avg := 0.0
	if len(results) > 0 {
		avg = timeMsTotal / float64(len(results))
	}

	return JudgeSummary{
		PassedCases:   passed,
		TotalCases:    len(results),
		AvgTimeMs:     avg,
		MaxTimeMs:     timeMsMax,
		MaxMemoryKB:   memoryMax,
		TotalMemoryKB: memoryTotal,
	}
}
