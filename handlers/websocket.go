package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type JoinPayload struct {
	UserID   string `json:"user_id"`
	UserName string `json:"user_name"`
	Rating   int    `json:"rating"`
	Tier     string `json:"tier"`
	ImageURL string `json:"image_url"`
}

type ChallengePayload struct {
	FromID     string `json:"from_id"`
	FromName   string `json:"from_name"`
	FromRating int    `json:"from_rating"`
	ToID       string `json:"to_id"`
	ContestID  string `json:"contest_id"`
}

type ChallengeResponsePayload struct {
	ContestID string `json:"contest_id"`
	FromID    string `json:"from_id"`
	ToID      string `json:"to_id"`
	Accepted  bool   `json:"accepted"`
}

type ReadyPayload struct {
	ContestID string `json:"contest_id"`
	UserID    string `json:"user_id"`
}

type Client struct {
	UserID   string
	UserName string
	Rating   int
	Tier     string
	ImageURL string
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *WSHub
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(4096)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})
	for {
		_, msgBytes, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
		c.Hub.handleMessage(c, msgBytes)
	}
}

type WSHub struct {
	clients    map[string]*Client
	mu         sync.RWMutex
	register   chan *Client
	unregister chan *Client

	readyMap map[string]map[string]bool
	readyMu  sync.Mutex
}

func NewWSHub() *WSHub {
	return &WSHub{
		clients:    make(map[string]*Client),
		register:   make(chan *Client, 16),
		unregister: make(chan *Client, 16),
		readyMap:   make(map[string]map[string]bool),
	}
}

func (h *WSHub) OnlineCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *WSHub) Run() {
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			h.clients[c.UserID] = c
			h.mu.Unlock()
			h.broadcastOnlineUsers()

		case c := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[c.UserID]; ok {
				delete(h.clients, c.UserID)
				close(c.Send)
			}
			h.mu.Unlock()
			h.broadcastOnlineUsers()
		}
	}
}

func (h *WSHub) sendTo(userID string, msg []byte) {
	h.mu.RLock()
	c, ok := h.clients[userID]
	h.mu.RUnlock()
	if ok {
		select {
		case c.Send <- msg:
		default:
		}
	}
}

func (h *WSHub) broadcast(msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, c := range h.clients {
		select {
		case c.Send <- msg:
		default:
		}
	}
}

func (h *WSHub) broadcastOnlineUsers() {
	h.mu.RLock()
	users := make([]map[string]interface{}, 0, len(h.clients))
	for _, c := range h.clients {
		users = append(users, map[string]interface{}{
			"user_id":   c.UserID,
			"user_name": c.UserName,
			"rating":    c.Rating,
			"tier":      c.Tier,
			"image_url": c.ImageURL,
		})
	}
	h.mu.RUnlock()

	payload, _ := json.Marshal(users)
	msg, _ := json.Marshal(WSMessage{Type: "online_users", Payload: payload})
	h.broadcast(msg)
}

func (h *WSHub) handleMessage(c *Client, data []byte) {
	var msg WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Println("WS parse error:", err)
		return
	}

	switch msg.Type {

	case "challenge":
		var p ChallengePayload
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return
		}
		p.FromID = c.UserID
		p.FromName = c.UserName
		p.FromRating = c.Rating
		payload, _ := json.Marshal(p)
		fwd, _ := json.Marshal(WSMessage{Type: "challenge_received", Payload: payload})
		h.sendTo(p.ToID, fwd)

	case "challenge_response":
		var p ChallengeResponsePayload
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return
		}
		payload, _ := json.Marshal(p)
		fwd, _ := json.Marshal(WSMessage{Type: "challenge_response", Payload: payload})
		h.sendTo(p.FromID, fwd)

	case "ready":
		var p ReadyPayload
		if err := json.Unmarshal(msg.Payload, &p); err != nil {
			return
		}

		h.readyMu.Lock()
		if h.readyMap[p.ContestID] == nil {
			h.readyMap[p.ContestID] = make(map[string]bool)
		}
		h.readyMap[p.ContestID][p.UserID] = true
		readyCount := len(h.readyMap[p.ContestID])
		h.readyMu.Unlock()

		statusPayload, _ := json.Marshal(map[string]interface{}{
			"contest_id":  p.ContestID,
			"ready_count": readyCount,
			"user_id":     p.UserID,
		})
		statusMsg, _ := json.Marshal(WSMessage{Type: "ready_update", Payload: statusPayload})
		h.broadcast(statusMsg)

		if readyCount >= 2 {
			h.readyMu.Lock()
			delete(h.readyMap, p.ContestID)
			h.readyMu.Unlock()

			startPayload, _ := json.Marshal(map[string]string{"contest_id": p.ContestID})
			startMsg, _ := json.Marshal(WSMessage{Type: "duel_start", Payload: startPayload})
			h.broadcast(startMsg)
		}
	}
}

func (h *Handler) ServeWS(hub *WSHub) gin.HandlerFunc {
	return func(c *gin.Context) {
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("WS upgrade error:", err)
			return
		}

		client := &Client{
			UserID:   c.Query("user_id"),
			UserName: c.Query("user_name"),
			Rating:   0,
			Tier:     c.Query("tier"),
			ImageURL: c.Query("image_url"),
			Conn:     conn,
			Send:     make(chan []byte, 64),
			Hub:      hub,
		}

		hub.register <- client
		go client.writePump()
		client.readPump()
	}
}
