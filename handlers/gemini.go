package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func callGemini(prompt string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", apiKey)

	body, _ := json.Marshal(geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
	})

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(respBody, &gemResp); err != nil {
		return "", err
	}

	if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("empty response from Gemini")
	}

	return gemResp.Candidates[0].Content.Parts[0].Text, nil
}

func (h *Handler) GetHint(c *gin.Context) {
	var req struct {
		ProblemTitle   string `json:"problem_title"`
		ProblemContent string `json:"problem_content"`
		UserCode       string `json:"user_code"`
		Language       string `json:"language"`
		HintNumber     int    `json:"hint_number"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	levelDesc := "gentle"
	if req.HintNumber == 2 {
		levelDesc = "moderate"
	} else if req.HintNumber >= 3 {
		levelDesc = "strong"
	}

	prompt := fmt.Sprintf(`You are a coding mentor helping a student solve a LeetCode problem during a timed competition.

Problem: %s
Description: %s

Student's current code (%s):
%s

Give a %s hint (hint #%d of 3). Rules:
- Do NOT give the full solution
- Hint 1: Point to the right data structure or approach
- Hint 2: Give a more specific algorithmic direction  
- Hint 3: Give a near-complete approach without actual code

Respond in 2-3 sentences max. Be concise and direct.`,
		req.ProblemTitle,
		req.ProblemContent,
		req.Language,
		req.UserCode,
		levelDesc,
		req.HintNumber,
	)

	hint, err := callGemini(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service unavailable"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"hint": strings.TrimSpace(hint)})
}

func (h *Handler) ReviewCode(c *gin.Context) {
	var req struct {
		ProblemTitle   string `json:"problem_title"`
		ProblemContent string `json:"problem_content"`
		UserCode       string `json:"user_code"`
		Language       string `json:"language"`
		Won            bool   `json:"won"`
		TimeTaken      int    `json:"time_taken"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prompt := fmt.Sprintf(`You are a competitive programming coach reviewing a solution submitted during a live duel.

Problem: %s
Description: %s

Submitted code (%s):
%s

Result: %s | Time taken: %d seconds

Provide a structured code review with exactly these sections:
1. **Complexity**: Time and space complexity in Big O notation
2. **Approach**: What algorithm/technique was used (1 sentence)
3. **Strengths**: What was done well (1-2 points)
4. **Improvements**: How to optimize or improve (1-2 points)
5. **Rating**: Score out of 10 with one line justification

Keep it concise. Total response under 150 words.`,
		req.ProblemTitle,
		req.ProblemContent,
		req.Language,
		req.UserCode,
		map[bool]string{true: "WON", false: "LOST"}[req.Won],
		req.TimeTaken,
	)

	review, err := callGemini(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI service unavailable"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"review": strings.TrimSpace(review)})
}
