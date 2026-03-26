package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mmcdole/gofeed"
)

//go:embed all:out
var staticFiles embed.FS

type NewsItem struct {
	ID       string `json:"id"`
	Time     string `json:"time"`
	Headline string `json:"headline"`
	Source   string `json:"source"`
	Category string `json:"category"`
	Urgency  string `json:"urgency"`
	Body     string `json:"body"`
	Region   string `json:"region"`
	Link     string `json:"link"`
}

type Feed struct {
	URL    string
	Source string
	Region string
}

var feeds = []Feed{
	// US
	{URL: "https://feeds.bbci.co.uk/news/business/rss.xml", Source: "BBC-BIZ", Region: "US"},
	{URL: "https://rss.nytimes.com/services/xml/rss/nyt/Business.xml", Source: "NYT", Region: "US"},
	{URL: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", Source: "WSJ", Region: "US"},
	{URL: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", Source: "CNBC", Region: "US"},
	{URL: "https://feeds.reuters.com/reuters/businessNews", Source: "RTRS", Region: "US"},
	// EU
	{URL: "https://www.ft.com/rss/home/uk", Source: "FT", Region: "EU"},
	{URL: "https://feeds.bbci.co.uk/news/world/europe/rss.xml", Source: "BBC-EU", Region: "EU"},
	{URL: "https://www.euronews.com/rss?level=theme&name=business", Source: "EURONEWS", Region: "EU"},
	{URL: "https://feeds.reuters.com/reuters/UKBusinessNews", Source: "RTRS-UK", Region: "EU"},
	// APAC
	{URL: "https://www.scmp.com/rss/91/feed", Source: "SCMP", Region: "APAC"},
	{URL: "https://feeds.bbci.co.uk/news/world/asia/rss.xml", Source: "BBC-APAC", Region: "APAC"},
	{URL: "https://asia.nikkei.com/rss/feed/nar", Source: "NIKKEI", Region: "APAC"},
	{URL: "https://feeds.reuters.com/reuters/INbusinessNews", Source: "RTRS-IN", Region: "APAC"},
}

// --- Store: global deduped ordered list of all news items ---

type Store struct {
	mu    sync.RWMutex
	items []NewsItem       // ordered, newest first
	seen  map[string]bool  // GUID -> already stored
}

func newStore() *Store {
	return &Store{seen: make(map[string]bool)}
}

// add deduplicates by GUID and prepends new items. Returns only the newly added items.
func (s *Store) add(guid string, item NewsItem) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.seen[guid] {
		return false
	}
	s.seen[guid] = true
	s.items = append([]NewsItem{item}, s.items...)
	if len(s.items) > 500 {
		s.items = s.items[:500]
	}
	return true
}

func (s *Store) snapshot() []NewsItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cp := make([]NewsItem, len(s.items))
	copy(cp, s.items)
	return cp
}

// --- Client: per-connection state tracking what's been sent ---

type Client struct {
	conn *websocket.Conn
	sent map[string]bool // news IDs already pushed to this client
	ch   chan []byte
}

// --- Hub: manages clients, pushes per-client diffs ---

type Hub struct {
	mu      sync.Mutex
	clients map[*Client]struct{}
	store   *Store
}

func newHub(store *Store) *Hub {
	return &Hub{clients: make(map[*Client]struct{}), store: store}
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c]; ok {
		close(c.ch)
		delete(h.clients, c)
	}
	h.mu.Unlock()
}

// pushNew sends each client only the items it hasn't received yet.
func (h *Hub) pushNew(newItems []NewsItem) {
	h.mu.Lock()
	defer h.mu.Unlock()

	for c := range h.clients {
		var unseen []NewsItem
		for _, item := range newItems {
			if !c.sent[item.ID] {
				c.sent[item.ID] = true
				unseen = append(unseen, item)
			}
		}
		if len(unseen) == 0 {
			continue
		}
		data, err := json.Marshal(unseen)
		if err != nil {
			continue
		}
		select {
		case c.ch <- data:
		default: // drop if slow
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func wsHandler(hub *Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		c := &Client{conn: conn, sent: make(map[string]bool), ch: make(chan []byte, 32)}

		// Send full backlog on connect, mark all as sent for this client.
		backlog := hub.store.snapshot()
		if len(backlog) > 0 {
			for _, item := range backlog {
				c.sent[item.ID] = true
			}
			if data, err := json.Marshal(backlog); err == nil {
				c.conn.WriteMessage(websocket.TextMessage, data)
			}
		}

		hub.register(c)
		defer hub.unregister(c)

		// Write pump
		go func() {
			for data := range c.ch {
				if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
					conn.Close()
					return
				}
			}
		}()

		// Read pump — keep alive, detect close
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				return
			}
		}
	}
}

// --- RSS fetching ---

var idCounter int
var idMu sync.Mutex

func nextID() string {
	idMu.Lock()
	defer idMu.Unlock()
	idCounter++
	return fmt.Sprintf("N%d", idCounter)
}

func fetchFeed(f Feed, store *Store) []NewsItem {
	fp := gofeed.NewParser()
	fp.UserAgent = "bloomberg-terminal/1.0"

	feed, err := fp.ParseURL(f.URL)
	if err != nil {
		log.Printf("fetch %s: %v", f.Source, err)
		return nil
	}

	var newItems []NewsItem
	for _, entry := range feed.Items {
		guid := entry.GUID
		if guid == "" {
			guid = entry.Link
		}

		var tags []string
		for _, c := range entry.Categories {
			tags = append(tags, c)
		}

		body := entry.Description
		if entry.Content != "" {
			body = entry.Content
		}
		body = stripTags(body)
		if len(body) > 400 {
			body = body[:400] + "..."
		}

		t := time.Now()
		if entry.PublishedParsed != nil {
			t = *entry.PublishedParsed
		}

		item := NewsItem{
			ID:       nextID(),
			Time:     t.UTC().Format("15:04:05"),
			Headline: entry.Title,
			Source:   f.Source,
			Category: categoryFromTags(entry.Title, tags),
			Urgency:  urgencyFromTitle(entry.Title),
			Body:     body,
			Region:   f.Region,
			Link:     entry.Link,
		}

		if store.add(guid, item) {
			newItems = append(newItems, item)
		}
	}
	return newItems
}

func categoryFromTags(title string, tags []string) string {
	combined := strings.ToLower(title + " " + strings.Join(tags, " "))
	switch {
	case contains(combined, "government", "policy", "fed", "central bank", "treasury", "election", "minister", "parliament", "congress", "senate", "regulation"):
		return "GOVT"
	case contains(combined, "earnings", "revenue", "profit", "ipo", "merger", "acquisition", "ceo", "company", "corporate"):
		return "CORP"
	case contains(combined, "gdp", "inflation", "cpi", "unemployment", "jobs", "payroll", "economy", "economic", "recession"):
		return "ECON"
	case contains(combined, "stock", "market", "index", "s&p", "nasdaq", "dow", "equity", "shares", "rally", "selloff"):
		return "MKTG"
	case contains(combined, "oil", "gold", "commodity", "crude", "wheat", "copper", "gas", "energy"):
		return "CMDTY"
	case contains(combined, "dollar", "euro", "yen", "yuan", "currency", "forex", "fx", "exchange rate"):
		return "FX"
	case contains(combined, "tech", "ai", "chip", "software", "apple", "google", "microsoft", "nvidia", "crypto", "bitcoin"):
		return "TECH"
	default:
		return "ECON"
	}
}

func contains(s string, keywords ...string) bool {
	for _, k := range keywords {
		if strings.Contains(s, k) {
			return true
		}
	}
	return false
}

func urgencyFromTitle(title string) string {
	t := strings.ToUpper(title)
	if contains(t, "BREAKING", "FLASH", "ALERT") {
		return "FLASH"
	}
	if contains(t, "URGENT", "UPDATE", "DEVELOPING") {
		return "URGENT"
	}
	return "NORMAL"
}

func stripTags(s string) string {
	var b strings.Builder
	inTag := false
	for _, r := range s {
		switch {
		case r == '<':
			inTag = true
		case r == '>':
			inTag = false
		case !inTag:
			b.WriteRune(r)
		}
	}
	return strings.TrimSpace(b.String())
}

func scheduler(hub *Hub, store *Store) {
	n := len(feeds)
	interval := (5 * time.Minute) / time.Duration(n)
	log.Printf("Scheduling %d feeds, one every %v", n, interval)

	for i := 0; ; i++ {
		f := feeds[i%n]
		log.Printf("Fetching [%s] %s", f.Region, f.Source)

		newItems := fetchFeed(f, store)
		if len(newItems) > 0 {
			hub.pushNew(newItems)
			log.Printf("Pushed %d new items from %s", len(newItems), f.Source)
		}

		time.Sleep(interval)
	}
}

func main() {
	store := newStore()
	hub := newHub(store)
	go scheduler(hub, store)

	distFS, err := fs.Sub(staticFiles, "out")
	if err != nil {
		log.Fatal(err)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/ws", wsHandler(hub))
	mux.Handle("/", http.FileServer(http.FS(distFS)))

	log.Println("Listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
