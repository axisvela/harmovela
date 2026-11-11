// Package client is the Harmovela HTTP client SDK.
package client

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/axisvela/harmovela/implementations/go/v3/harness"
)

const (
	DefaultBaseURL = "http://127.0.0.1:8790"
	DefaultPath    = "/harmovela/api"
)

// Error is a non-2xx Harmovela API response.
type Error struct {
	StatusCode int
	Body       any
}

func (e *Error) Error() string {
	return fmt.Sprintf("harmovela HTTP %d", e.StatusCode)
}

// InvalidEventError is returned when an envelope fails local validation.
type InvalidEventError struct {
	Errors []string
}

func (e *InvalidEventError) Error() string {
	return "invalid Harmovela event: " + strings.Join(e.Errors, "; ")
}

type Client struct {
	BaseURL string
	Path    string
	HTTP    *http.Client
}

func New(baseURL string) *Client {
	return NewWithPath(baseURL, DefaultPath)
}

func NewWithPath(baseURL, path string) *Client {
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}
	if path == "" {
		path = DefaultPath
	}
	return &Client{
		BaseURL: strings.TrimRight(baseURL, "/"),
		Path:    "/" + strings.Trim(path, "/"),
		HTTP:    http.DefaultClient,
	}
}

func (c *Client) Health(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodGet, "/healthz", nil, &out)
}

func (c *Client) Publish(ctx context.Context, value map[string]any) (map[string]any, error) {
	if errors := harness.ValidateEnvelope(value); len(errors) > 0 {
		return nil, &InvalidEventError{Errors: errors}
	}
	var out map[string]any
	return out, c.request(ctx, http.MethodPost, "/events", value, &out)
}

func (c *Client) Stats(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodGet, "/stats", nil, &out)
}

func (c *Client) Pending(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodGet, "/pending", nil, &out)
}

func (c *Client) DeadLettered(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodGet, "/dlq", nil, &out)
}

func (c *Client) CreateSubscription(ctx context.Context, filter map[string]any) (map[string]any, error) {
	var out map[string]any
	body := map[string]any{"filter": filter}
	return out, c.request(ctx, http.MethodPost, "/subscriptions", body, &out)
}

func (c *Client) ListSubscriptions(ctx context.Context) ([]map[string]any, error) {
	var out struct {
		Subscriptions []map[string]any `json:"subscriptions"`
	}
	if err := c.request(ctx, http.MethodGet, "/subscriptions", nil, &out); err != nil {
		return nil, err
	}
	return out.Subscriptions, nil
}

func (c *Client) GetSubscription(ctx context.Context, id string) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodGet, "/subscriptions/"+url.PathEscape(id), nil, &out)
}

func (c *Client) DeleteSubscription(ctx context.Context, id string) (map[string]any, error) {
	var out map[string]any
	return out, c.request(ctx, http.MethodDelete, "/subscriptions/"+url.PathEscape(id), nil, &out)
}

func (c *Client) Poll(ctx context.Context, id string) ([]map[string]any, error) {
	var out struct {
		Events []map[string]any `json:"events"`
	}
	if err := c.request(ctx, http.MethodGet, "/subscriptions/"+url.PathEscape(id)+"/events", nil, &out); err != nil {
		return nil, err
	}
	return out.Events, nil
}

// Stream reads live SSE events until the context is cancelled or the stream ends.
func (c *Client) Stream(ctx context.Context, id string, handler func(map[string]any)) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.url("/subscriptions/"+url.PathEscape(id)+"/stream"), nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "text/event-stream")
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return &Error{StatusCode: resp.StatusCode, Body: string(body)}
	}
	scanner := bufio.NewScanner(resp.Body)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		payload := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
		if payload == "" {
			continue
		}
		var value map[string]any
		if err := json.Unmarshal([]byte(payload), &value); err != nil {
			return fmt.Errorf("invalid Harmovela stream event: %w", err)
		}
		handler(value)
	}
	return scanner.Err()
}

func (c *Client) request(ctx context.Context, method, route string, body, out any) error {
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.url(route), reader)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	var parsed any
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &parsed); err != nil {
			return &Error{StatusCode: resp.StatusCode, Body: string(raw)}
		}
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return &Error{StatusCode: resp.StatusCode, Body: parsed}
	}
	if out != nil && parsed != nil {
		payload, _ := json.Marshal(parsed)
		if err := json.Unmarshal(payload, out); err != nil {
			return err
		}
	}
	return nil
}

func (c *Client) url(route string) string {
	if !strings.HasPrefix(route, "/") {
		route = "/" + route
	}
	return c.BaseURL + c.Path + route
}
