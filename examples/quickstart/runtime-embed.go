package main

import (
	"log"

	"github.com/axisrobo/harmovela/aep"
	"github.com/axisrobo/harmovela/aep/runtime"
)

func main() {
	config := runtime.DefaultConfig()
	config.Delivery.Store = "memory"
	config.Transports.WebSocket.Enabled = false
	config.Transports.SSE.Enabled = false
	config.Transports.API.Enabled = false

	svc := runtime.NewRuntimeService(config)
	svc.Subscribe("task.*", func(event map[string]any) {
		log.Printf("received %v %v", event["type"], event["id"])
	})

	svc.Start()
	defer svc.Stop()

	svc.Publish(map[string]any{
		"spec_version": "0.2",
		"id":          "evt_embed",
		"type":        "task.submitted",
		"source":      "example:quickstart",
		"created_at":  aep.Now(),
		"payload":     map[string]any{"task_id": "task_01"},
	})
}
