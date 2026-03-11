package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

type lcGraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

type lcProblemListResponse struct {
	Data struct {
		ProblemsetQuestionList struct {
			Questions []struct {
				TitleSlug  string `json:"titleSlug"`
				Title      string `json:"title"`
				Difficulty string `json:"difficulty"`
			} `json:"questions"`
		} `json:"problemsetQuestionList"`
	} `json:"data"`
}

type lcProblemDetailResponse struct {
	Data struct {
		Question struct {
			Title            string `json:"title"`
			TitleSlug        string `json:"titleSlug"`
			Difficulty       string `json:"difficulty"`
			Content          string `json:"content"`
			ExampleTestcases string `json:"exampleTestcases"`
			CodeSnippets     []struct {
				LangSlug string `json:"langSlug"`
				Code     string `json:"code"`
			} `json:"codeSnippets"`
			TopicTags []struct {
				Name string `json:"name"`
			} `json:"topicTags"`
		} `json:"question"`
	} `json:"data"`
}

type CodeSnippet struct {
	LangSlug string `json:"lang_slug"`
	Code     string `json:"code"`
}

type ProblemResponse struct {
	Slug         string        `json:"slug"`
	Title        string        `json:"title"`
	Difficulty   string        `json:"difficulty"`
	Content      string        `json:"content"`
	StarterCode  string        `json:"starter_code"`
	Examples     string        `json:"examples"`
	TimerSecs    int           `json:"timer_secs"`
	Tags         []string      `json:"tags"`
	LeetcodeURL  string        `json:"leetcode_url"`
	CodeSnippets []CodeSnippet `json:"code_snippets"`
}

var (
	contestProblemCache   = make(map[string]*ProblemResponse)
	contestProblemCacheMu sync.RWMutex
)

func timerForDifficulty(diff string) int {
	switch strings.ToLower(diff) {
	case "medium":
		return 25 * 60
	case "hard":
		return 45 * 60
	default:
		return 15 * 60
	}
}

func lcGraphQL(payload lcGraphQLRequest) ([]byte, error) {
	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", "https://leetcode.com/graphql", bytes.NewBuffer(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Referer", "https://leetcode.com")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; EloNode/1.0)")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
