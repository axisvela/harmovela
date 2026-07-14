package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	eventcore "github.com/axisrobo/harmovela/event"
	"github.com/axisrobo/harmovela/runtime"
	"github.com/gorilla/websocket"
	"github.com/spf13/cobra"
)

func main() {
	root := &cobra.Command{Use: "harmovela", Short: "Harmovela Protocol CLI"}

	var initConfig string
	initCmd := &cobra.Command{Use: "init", Short: "Create a Harmovela runtime config file", RunE: func(_ *cobra.Command, _ []string) error {
		if err := runtime.WriteDefaultConfig(initConfig); err != nil {
			return err
		}
		fmt.Printf("created %s\n", initConfig)
		return nil
	}}
	initCmd.Flags().StringVar(&initConfig, "config", "harmovela.config.json", "config file path")

	var startConfig string
	startCmd := &cobra.Command{Use: "start", Short: "Start the local harmovelad runtime daemon", RunE: func(_ *cobra.Command, _ []string) error {
		config, err := runtime.LoadConfig(startConfig, nil)
		if err != nil {
			return err
		}
		svc := runtime.NewRuntimeService(config)
		if err := svc.Start(); err != nil {
			return err
		}
		fmt.Printf("harmovelad started api=%d\n", svc.APIPort())
		select {}
	}}
	startCmd.Flags().StringVar(&startConfig, "config", "harmovela.config.json", "config file path")

	var statusURL string
	statusCmd := &cobra.Command{Use: "status", Short: "Query a harmovelad health endpoint", RunE: func(_ *cobra.Command, _ []string) error {
		resp, err := http.Get(statusURL)
		if err != nil {
			return fmt.Errorf("status request failed: %w", err)
		}
		defer resp.Body.Close()
		body, _ := io.ReadAll(resp.Body)
		fmt.Println(string(body))
		return nil
	}}
	statusCmd.Flags().StringVar(&statusURL, "url", "http://127.0.0.1:8790/harmovela/api/healthz", "health endpoint URL")

	var emitPayload, emitURL, emitID, emitSource string
	emitCmd := &cobra.Command{Use: "emit <type>", Short: "Emit one Harmovela event over WebSocket", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		var payload map[string]any
		if err := json.Unmarshal([]byte(emitPayload), &payload); err != nil {
			return fmt.Errorf("invalid JSON payload")
		}
		id := emitID
		if id == "" {
			id = fmt.Sprintf("evt_%d", time.Now().UnixNano())
		}
		event := map[string]any{
			"spec_version": "0.2", "id": id, "type": args[0], "source": emitSource,
			"created_at": time.Now().UTC().Format(time.RFC3339), "payload": payload,
		}
		conn, _, err := websocket.DefaultDialer.Dial(emitURL, nil)
		if err != nil {
			return fmt.Errorf("emit: %w. Is harmovelad running?", err)
		}
		defer conn.Close()
		data, _ := json.Marshal(event)
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			return err
		}
		fmt.Println(string(data))
		return nil
	}}
	emitCmd.Flags().StringVar(&emitPayload, "payload", "{}", "event payload JSON")
	emitCmd.Flags().StringVar(&emitURL, "url", "ws://127.0.0.1:8787/harmovela", "WebSocket URL")
	emitCmd.Flags().StringVar(&emitID, "id", "", "event id")
	emitCmd.Flags().StringVar(&emitSource, "source", "cli:harmovela", "event source")

	var subType, subURL string
	subscribeCmd := &cobra.Command{Use: "subscribe", Short: "Subscribe to Harmovela events over WebSocket", RunE: func(_ *cobra.Command, _ []string) error {
		conn, _, err := websocket.DefaultDialer.Dial(subURL, nil)
		if err != nil {
			return fmt.Errorf("subscribe: %w. Is harmovelad running?", err)
		}
		defer conn.Close()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				return nil
			}
			var event map[string]any
			if json.Unmarshal(message, &event) != nil {
				continue
			}
			typ, _ := event["type"].(string)
			if eventcore.MatchesType(subType, typ) {
				fmt.Println(string(message))
			}
		}
	}}
	subscribeCmd.Flags().StringVar(&subType, "type", "*", "event type pattern")
	subscribeCmd.Flags().StringVar(&subURL, "url", "ws://127.0.0.1:8787/harmovela", "WebSocket URL")

	var dlqConfig string
	dlqCmd := &cobra.Command{Use: "dlq [subcommand]", Short: "Inspect dead-lettered events", RunE: func(_ *cobra.Command, args []string) error {
		sub := "list"
		if len(args) > 0 {
			sub = args[0]
		}
		if sub != "list" {
			return fmt.Errorf("unsupported dlq command: %s", sub)
		}
		config, err := runtime.LoadConfig(dlqConfig, nil)
		if err != nil {
			return err
		}
		store, err := runtime.CreateDeliveryStore(config)
		if err != nil {
			return err
		}
		records := store.GetDeadLettered()
		stats := store.GetStats()
		out, _ := json.Marshal(map[string]any{"deadLettered": stats["deadLettered"], "records": records})
		fmt.Println(string(out))
		if closer, ok := store.(interface{ Close() error }); ok {
			closer.Close()
		}
		return nil
	}}
	dlqCmd.Flags().StringVar(&dlqConfig, "config", "harmovela.config.json", "config file path")

	var conformanceProfile string
	conformanceCmd := &cobra.Command{Use: "conformance", Short: "Run Harmovela conformance fixtures", RunE: func(_ *cobra.Command, _ []string) error {
		cmd := exec.Command("go", "test", "./event/", "-run", "TestConformance", "-v")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if conformanceProfile != "" {
			cmd.Env = append(os.Environ(), "HARMOVELA_PROFILE="+conformanceProfile)
		}
		return cmd.Run()
	}}
	conformanceCmd.Flags().StringVar(&conformanceProfile, "profile", "", "conformance profile to filter fixtures")

	root.AddCommand(initCmd, startCmd, statusCmd, emitCmd, subscribeCmd, dlqCmd, conformanceCmd, subscriptionsCmd())
	if err := root.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "harmovela: %v\n", err)
		os.Exit(1)
	}
}

func subscriptionsCmd() *cobra.Command {
	var base, filter string

	cmd := &cobra.Command{Use: "subscriptions", Short: "Manage runtime subscriptions over HTTP"}
	cmd.PersistentFlags().StringVar(&base, "base", "http://127.0.0.1:8790/harmovela/api", "runtime API base URL")

	cmd.AddCommand(&cobra.Command{Use: "create", Short: "Create a subscription", RunE: func(_ *cobra.Command, _ []string) error {
		var f map[string]any
		if err := json.Unmarshal([]byte(filter), &f); err != nil {
			return fmt.Errorf("invalid JSON filter")
		}
		body, _ := json.Marshal(map[string]any{"filter": f})
		resp, err := http.Post(base+"/subscriptions", "application/json", strings.NewReader(string(body)))
		if err != nil {
			return fmt.Errorf("request failed: %w. Is harmovelad running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 201 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}})

	cmd.AddCommand(&cobra.Command{Use: "list", Short: "List subscriptions", RunE: func(_ *cobra.Command, _ []string) error {
		resp, err := http.Get(base + "/subscriptions")
		if err != nil {
			return fmt.Errorf("request failed: %w. Is harmovelad running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}})

	cmd.AddCommand(&cobra.Command{Use: "delete <id>", Short: "Delete a subscription", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		req, _ := http.NewRequest(http.MethodDelete, base+"/subscriptions/"+args[0], nil)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return fmt.Errorf("request failed: %w. Is harmovelad running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode == 404 {
			return fmt.Errorf("not found")
		}
		if resp.StatusCode != 200 {
			return fmt.Errorf("request failed: HTTP %d", resp.StatusCode)
		}
		io.Copy(os.Stdout, resp.Body)
		return nil
	}})

	cmd.AddCommand(&cobra.Command{Use: "stream <id>", Short: "Stream events for a subscription", Args: cobra.ExactArgs(1), RunE: func(_ *cobra.Command, args []string) error {
		resp, err := http.Get(base + "/subscriptions/" + args[0] + "/stream")
		if err != nil {
			return fmt.Errorf("request failed: %w. Is harmovelad running?", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode == 404 {
			return fmt.Errorf("not found")
		}
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()
			if strings.HasPrefix(line, "data: ") {
				fmt.Println(strings.TrimPrefix(line, "data: "))
			}
		}
		return scanner.Err()
	}})

	createCmd := cmd.Commands()[0]
	createCmd.Flags().StringVar(&filter, "filter", "{}", "subscription filter JSON")

	return cmd
}
