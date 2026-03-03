package engine

import (
	"errors"

	"github.com/Swatantra-66/contest-rating-system/models"
)

type Bracket struct {
	MinPercentile float64
	Performance   int
}

var brackets = []Bracket{
	{MinPercentile: 0.99, Performance: 1800},
	{MinPercentile: 0.95, Performance: 1400},
	{MinPercentile: 0.90, Performance: 1200},
	{MinPercentile: 0.80, Performance: 1150},
	{MinPercentile: 0.70, Performance: 1100},
	{MinPercentile: 0.50, Performance: 1000},
}

type Result struct {
	Beaten            int
	Percentile        float64
	PerformanceRating int
	RatingChange      int
	NewRating         int
	NewTier           models.Tier
}

func Calculate(rank, totalParticipants, oldRating int) (Result, error) {
	if totalParticipants <= 0 {
		return Result{}, errors.New("total participants must be greater than zero")
	}
	if rank <= 0 || rank > totalParticipants {
		return Result{}, errors.New("invalid rank: must be between 1 and total participants")
	}

	beaten := totalParticipants - rank
	percentile := float64(beaten) / float64(totalParticipants)

	performance := resolvePerformance(percentile)
	change := (performance - oldRating) / 2
	newRating := oldRating + change

	return Result{
		Beaten:            beaten,
		Percentile:        percentile,
		PerformanceRating: performance,
		RatingChange:      change,
		NewRating:         newRating,
		NewTier:           ResolveTier(newRating),
	}, nil
}

func resolvePerformance(percentile float64) int {
	for _, b := range brackets {
		if percentile >= b.MinPercentile {
			return b.Performance
		}
	}
	return 900
}

func ResolveTier(rating int) models.Tier {
	switch {
	case rating >= 1800:
		return models.TierGrandmaster
	case rating >= 1400:
		return models.TierMaster
	case rating >= 1200:
		return models.TierExpert
	case rating >= 1150:
		return models.TierSpecialist
	case rating >= 1100:
		return models.TierApprentice
	default:
		return models.TierNewbie
	}
}
