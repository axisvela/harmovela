package main

import (
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"github.com/axisrobo/aep/aep/runtime"
)

func main() {
	config, err := runtime.LoadConfig(os.Getenv("HARMOVELA_CONFIG"), nil)
	if err != nil {
		fmt.Fprintf(os.Stderr, "aepd: %v\n", err)
		os.Exit(1)
	}
	svc := runtime.NewRuntimeService(config)
	if err := svc.Start(); err != nil {
		fmt.Fprintf(os.Stderr, "aepd: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("aepd started api=%d\n", svc.APIPort())

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig
	svc.Stop()
}
