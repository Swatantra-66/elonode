package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/Swatantra-66/contest-rating-system/handlers"
	"github.com/Swatantra-66/contest-rating-system/models"
)

func main() {
	_ = godotenv.Load()

	clerkSecret := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecret != "" {
		clerk.SetKey(clerkSecret)
	} else {
		log.Println("WARNING: CLERK_SECRET_KEY is not set. Admin routes will fail.")
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=postgres password=user15 dbname=contest_rating port=5432 sslmode=disable"
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err == nil {
		db = db.Debug()
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
		sqlDB.SetConnMaxLifetime(time.Hour)
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Contest{},
		&models.RatingHistory{},
	); err != nil {
		log.Fatal("Migration failed:", err)
	}

	r := gin.Default()
	r.Use(corsMiddleware())

	h := handlers.New(db)

	api := r.Group("/api")
	{
		api.GET("/users/:id", h.GetUser)
		api.GET("/users/:id/history", h.GetRatingHistory)
		api.GET("/users", h.GetUsers)
		api.GET("/health", h.GetHealth)
		api.GET("/stats", h.GetStats)
		api.GET("/contests", h.GetContests)
		api.GET("/contests/:id", h.GetContest)
		api.GET("/history", h.GetGlobalHistory)

		api.POST("/contests/:id/finalize", h.FinalizeContest)
		api.POST("/contests", h.CreateContest)
		api.POST("/users", h.CreateUser)

		api.DELETE("/contests/:id", RequireAdminAuth(), h.DeleteContest)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		log.Println("Server starting on :8080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit
	log.Println("Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited properly")
}

func RequireAdminAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		sessionToken := strings.TrimPrefix(authHeader, "Bearer ")

		if sessionToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: No token provided"})
			return
		}

		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: sessionToken,
		})
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: Invalid or expired token"})
			return
		}

		usr, err := user.Get(c.Request.Context(), claims.Subject)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Internal Error: Could not verify user profile"})
			return
		}

		var metadata map[string]interface{}
		if len(usr.PublicMetadata) > 0 {
			if err := json.Unmarshal(usr.PublicMetadata, &metadata); err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Internal Error: Failed to parse user metadata"})
				return
			}
		}

		role, ok := metadata["role"].(string)
		if !ok || role != "admin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Forbidden: System Admin access required"})
			return
		}

		c.Next()
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
