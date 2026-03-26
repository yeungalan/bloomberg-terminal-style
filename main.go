package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"html"
	"io/fs"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mmcdole/gofeed"
)

//go:embed all:out
var staticFiles embed.FS

type NewsItem struct {
	ID       string    `json:"id"`
	Time     string    `json:"time"`
	Headline string    `json:"headline"`
	Source   string    `json:"source"`
	Category string    `json:"category"`
	Urgency  string    `json:"urgency"`
	Body     string    `json:"body"`
	Region   string    `json:"region"`
	Link     string    `json:"link"`
	Parsed   time.Time `json:"-"` // for sorting, not sent to client
	ISOTime  string    `json:"timestamp"`
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
	{URL: "https://rthk.hk/rthk/news/rss/e_expressnews_elocal.xml", Source: "RTHK", Region: "APAC"},
	// Global
	{URL: "https://news.google.com/rss", Source: "GOOG", Region: "US"},
	{URL: "https://rsshub.app/apnews/topics/apf-topnews", Source: "AP", Region: "US"},
	// US cont.
	{URL: "https://feeds.nbcnews.com/nbcnews/public/news", Source: "NBC", Region: "US"},
	{URL: "https://abcnews.go.com/abcnews/topstories", Source: "ABC", Region: "US"},
	{URL: "https://news.yahoo.co.jp/rss/topics/top-picks.xml", Source: "YAHOO-JP", Region: "APAC"},
	// EU cont.
	{URL: "https://www.theguardian.com/world/rss", Source: "GUARDIAN", Region: "EU"},
	{URL: "https://www.aljazeera.com/xml/rss/all.xml", Source: "ALJAZEERA", Region: "EU"},
	{URL: "https://www.rfi.fr/en/rss.xml", Source: "RFI", Region: "EU"},
	{URL: "https://feeds.skynews.com/feeds/rss/world.xml", Source: "SKY", Region: "EU"},
	// APAC cont.
	{URL: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml", Source: "CNA", Region: "APAC"},
	{URL: "https://www.cbc.ca/webfeed/rss/rss-topstories", Source: "CBC", Region: "US"},
	{URL: "https://globalnews.ca/feed/", Source: "GLOBAL", Region: "US"},
	// MENA
	{URL: "https://www.mena.org.eg/en/rss", Source: "MENA", Region: "EU"},
}

func sortByTime(items []NewsItem) {
	sort.Slice(items, func(i, j int) bool {
		return items[i].Parsed.After(items[j].Parsed)
	})
}

// --- Store ---

type Store struct {
	mu   sync.RWMutex
	items []NewsItem
	seen  map[string]bool
}

func newStore() *Store {
	return &Store{seen: make(map[string]bool)}
}

func (s *Store) addBatch(items []NewsItem, guids []string) []NewsItem {
	s.mu.Lock()
	defer s.mu.Unlock()

	var added []NewsItem
	for i, item := range items {
		if s.seen[guids[i]] {
			continue
		}
		s.seen[guids[i]] = true
		added = append(added, item)
	}
	if len(added) == 0 {
		return nil
	}

	s.items = append(added, s.items...)
	sortByTime(s.items)
	if len(s.items) > 500 {
		s.items = s.items[:500]
	}
	return added
}

func (s *Store) snapshot() []NewsItem {
	s.mu.RLock()
	defer s.mu.RUnlock()
	cp := make([]NewsItem, len(s.items))
	copy(cp, s.items)
	return cp
}

// --- Client / Hub ---

type Client struct {
	conn *websocket.Conn
	sent map[string]bool
	ch   chan []byte
}

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

func (h *Hub) pushNew(newItems []NewsItem) {
	sortByTime(newItems)

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
		default:
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

		go func() {
			for data := range c.ch {
				if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
					conn.Close()
					return
				}
			}
		}()

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

type rawItem struct {
	item NewsItem
	guid string
}

func parseFeed(f Feed) []rawItem {
	fp := gofeed.NewParser()
	fp.UserAgent = "bloomberg-terminal/1.0"

	feed, err := fp.ParseURL(f.URL)
	if err != nil {
		log.Printf("fetch %s: %v", f.Source, err)
		return nil
	}

	var out []rawItem
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

		out = append(out, rawItem{
			guid: guid,
			item: NewsItem{
				ID:       nextID(),
				Time:     t.UTC().Format("15:04:05"),
				ISOTime:  t.UTC().Format(time.RFC3339),
				Headline: entry.Title,
				Source:   f.Source,
				Category: categoryFromTags(entry.Title, tags),
				Urgency:  urgencyFromTitle(entry.Title),
				Body:     body,
				Region:   f.Region,
				Link:     entry.Link,
				Parsed:   t,
			},
		})
	}
	return out
}

func ingestRaw(raws []rawItem, store *Store) []NewsItem {
	items := make([]NewsItem, len(raws))
	guids := make([]string, len(raws))
	for i, r := range raws {
		items[i] = r.item
		guids[i] = r.guid
	}
	return store.addBatch(items, guids)
}

// fetchAllConcurrent fetches all feeds in parallel, returns sorted new items.
func fetchAllConcurrent(store *Store) []NewsItem {
	var mu sync.Mutex
	var allRaw []rawItem
	var wg sync.WaitGroup

	for _, f := range feeds {
		wg.Add(1)
		go func(f Feed) {
			defer wg.Done()
			raws := parseFeed(f)
			if len(raws) > 0 {
				mu.Lock()
				allRaw = append(allRaw, raws...)
				mu.Unlock()
				log.Printf("Fetched %d items from [%s] %s", len(raws), f.Region, f.Source)
			}
		}(f)
	}
	wg.Wait()

	return ingestRaw(allRaw, store)
}

func scheduler(hub *Hub, store *Store) {
	// Initial: fetch all feeds concurrently
	log.Printf("Initial fetch: loading all %d feeds concurrently...", len(feeds))
	newItems := fetchAllConcurrent(store)
	log.Printf("Initial fetch complete: %d items loaded", len(newItems))
	// No push needed — backlog is sent on client connect

	// Rolling: one feed at a time
	n := len(feeds)
	interval := (5 * time.Minute) / time.Duration(n)
	log.Printf("Rolling schedule: one feed every %v", interval)

	for i := 0; ; i++ {
		time.Sleep(interval)
		f := feeds[i%n]
		log.Printf("Fetching [%s] %s", f.Region, f.Source)

		raws := parseFeed(f)
		if added := ingestRaw(raws, store); len(added) > 0 {
			hub.pushNew(added)
			log.Printf("Pushed %d new items from %s", len(added), f.Source)
		}
	}
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
	return strings.TrimSpace(html.UnescapeString(b.String()))
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
