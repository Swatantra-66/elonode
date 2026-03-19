package handlers

import "testing"

func TestNormalizeOutput(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want string
	}{
		{
			name: "normalizes windows newlines and trims trailing whitespace",
			in:   "1 2 3   \r\n4 5 6\t\r\n",
			want: "1 2 3\n4 5 6",
		},
		{
			name: "removes trailing blank lines only",
			in:   "hello\nworld\n\n\n",
			want: "hello\nworld",
		},
		{
			name: "keeps internal blank lines",
			in:   "a\n\nb\n",
			want: "a\n\nb",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := normalizeOutput(tc.in)
			if got != tc.want {
				t.Fatalf("normalizeOutput() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestOutputsMatch(t *testing.T) {
	if !outputsMatch("42 \n", "42") {
		t.Fatal("expected outputsMatch to treat trailing spaces/newline as equal")
	}
	if !outputsMatch("3.1415926", "3.1415927") {
		t.Fatal("expected outputsMatch to tolerate small float differences")
	}
	if outputsMatch("42\n43", "42\n44") {
		t.Fatal("expected outputsMatch to detect different values")
	}
	if outputsMatch("3.14", "3.14159") {
		t.Fatal("expected outputsMatch to detect larger float differences")
	}
}

func TestDeriveVerdict(t *testing.T) {
	cases := []struct {
		name          string
		statusID      int
		matchedOutput bool
		want          string
	}{
		{"accepted", 3, true, "Accepted"},
		{"accepted status but wrong output", 3, false, "Wrong Answer"},
		{"wrong answer", 4, false, "Wrong Answer"},
		{"tle", 5, false, "Time Limit Exceeded"},
		{"compile error", 6, false, "Compile Error"},
		{"runtime error", 12, false, "Runtime Error"},
		{"internal fallback", 13, false, "Internal Error"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := deriveVerdict(tc.statusID, tc.matchedOutput)
			if got != tc.want {
				t.Fatalf("deriveVerdict() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestOutputsMatchWithChecker(t *testing.T) {
	tests := []struct {
		name       string
		checker    string
		tolerance  float64
		actual     string
		expected   string
		wantPassed bool
	}{
		{"exact pass", "exact", 0, "a b\nc", "a b\nc", true},
		{"exact fail whitespace tokenization", "exact", 0, "a  b", "a b", false},
		{"token pass", "token", 0, "a  b \n c", "a b c", true},
		{"token fail order", "token", 0, "1 2 3", "1 3 2", false},
		{"float pass default tol", "float", 0, "3.1415926", "3.1415927", true},
		{"float fail custom tol", "float", 1e-9, "3.1415926", "3.1415927", false},
		{"unordered lines pass", "unordered_lines", 0, "apple\nbanana", "banana\napple", true},
		{"unordered lines fail duplicates", "unordered_lines", 0, "apple\nbanana", "banana\nbanana", false},
		{"fallback standard", "unknown_checker", 0, "42 \n", "42", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := outputsMatchWithChecker(tc.actual, tc.expected, tc.checker, tc.tolerance)
			if got != tc.wantPassed {
				t.Fatalf("outputsMatchWithChecker() = %v, want %v", got, tc.wantPassed)
			}
		})
	}
}
